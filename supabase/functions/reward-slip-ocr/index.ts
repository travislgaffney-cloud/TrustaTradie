import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TextractClient, AnalyzeExpenseCommand } from 'npm:@aws-sdk/client-textract@3';
import { Jimp } from 'npm:jimp@1';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

// 8x8 difference hash (dHash): robust to re-compression and minor re-crops
// in a way an exact file hash isn't, which is the whole point of checking
// it against OTHER slips later (reward-slip-evaluate) — a tradie re-saving
// or lightly cropping the same photo still hashes to something very close.
// Never blocks the upload: any failure here (unexpected image format, a
// Jimp/Deno incompatibility) just means this one slip skips the
// near-duplicate check, same "degrade, don't block" rule as OCR itself.
async function computeImageHash(bytes: Uint8Array): Promise<string | null> {
  try {
    const image = await Jimp.read(bytes.buffer as ArrayBuffer);
    image.resize({ w: 9, h: 8 }).greyscale();

    let bits = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = image.getPixelColor(x, y);
        const right = image.getPixelColor(x + 1, y);
        bits += left > right ? '1' : '0';
      }
    }

    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch (err) {
    console.warn('[reward-slip-ocr] image hash failed, continuing without it:', err);
    return null;
  }
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// AWS Textract's AnalyzeExpense is purpose-built for receipts/invoices and
// returns structured fields (vendor, total, date) instead of raw text to
// parse ourselves — see the plan doc for why this was picked over a generic
// OCR API. OCR is a pre-fill convenience only in Phase 1: the tradie always
// confirms or corrects the extracted values before submitting, and nothing
// here blocks submission if OCR is unavailable or low-confidence.
async function extractExpenseFields(bytes: Uint8Array) {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') ?? 'eu-west-1';

  if (!accessKeyId || !secretAccessKey) {
    // No AWS credentials configured yet — degrade to manual entry rather
    // than failing the upload. See the plan doc's OCR provider note.
    return { ocrAvailable: false as const };
  }

  const client = new TextractClient({ region, credentials: { accessKeyId, secretAccessKey } });
  const result = await client.send(new AnalyzeExpenseCommand({ Document: { Bytes: bytes } }));

  const fields = result.ExpenseDocuments?.[0]?.SummaryFields ?? [];
  const find = (type: string) => fields.find((f) => f.Type?.Text === type)?.ValueDetection;

  const vendor = find('VENDOR_NAME');
  const total = find('TOTAL');
  const date = find('INVOICE_RECEIPT_DATE');

  const confidences = [vendor?.Confidence, total?.Confidence, date?.Confidence].filter(
    (c): c is number => typeof c === 'number'
  );
  const confidence = confidences.length > 0 ? Math.min(...confidences) / 100 : 0;

  return {
    ocrAvailable: true as const,
    supplierName: vendor?.Text ?? null,
    total: total?.Text ? Number(total.Text.replace(/[^0-9.]/g, '')) || null : null,
    date: date?.Text ?? null,
    confidence,
  };
}

Deno.serve(async (req) => {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:reward-slip-ocr`, { limit: 30, windowSeconds: 300 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const userLimit = await checkRateLimit(supabaseAdmin, `user:${caller.id}:reward-slip-ocr`, { limit: 10, windowSeconds: 300 });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const { imagePath } = (await req.json()) as { imagePath?: string };
    if (!imagePath) return new Response(JSON.stringify({ error: 'Missing imagePath' }), { status: 400 });

    // The path's first segment is the uploading tradie's own id (see the
    // reward-slips bucket's RLS policies) — enforce the same ownership rule
    // here, since this function reads via the service-role client and would
    // otherwise happily OCR (and return) another tradie's private slip.
    const ownerId = imagePath.split('/')[0];
    if (ownerId !== caller.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from('reward-slips')
      .download(imagePath);
    if (downloadError || !file) {
      return new Response(JSON.stringify({ error: 'Could not read the uploaded image' }), { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const [extracted, imageHash] = await Promise.all([
      extractExpenseFields(bytes),
      computeImageHash(bytes),
    ]);

    return new Response(JSON.stringify({ ...extracted, imageHash }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('reward-slip-ocr error:', err);
    // OCR is enhancement-only — a failure here should never block the
    // tradie from falling back to manual entry.
    return new Response(JSON.stringify({ ocrAvailable: false, error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 200,
    });
  }
});
