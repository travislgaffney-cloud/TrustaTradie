import Image from "next/image";

export const APP_STORE_URL = "https://apps.apple.com/app/id6828108001";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.trustatradie.app";

export function StoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href={APP_STORE_URL} className="inline-flex items-center">
        <Image
          src="/app-store-badge.svg"
          alt="Download on the App Store"
          width={167}
          height={56}
          className="h-14 w-auto"
        />
      </a>
      <a href={PLAY_STORE_URL} className="inline-flex items-center">
        <Image
          src="/google-play-badge.svg"
          alt="Get it on Google Play"
          width={189}
          height={56}
          className="h-14 w-auto"
        />
      </a>
    </div>
  );
}
