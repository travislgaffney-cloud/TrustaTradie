-- reward_slip_approved/reward_slip_rejected were added to the app's
-- NotificationType TypeScript union (Phase 2) but the matching Postgres enum
-- values were never added — found live: the notifications insert in
-- reward-slip-evaluate was failing silently on every auto-approve/reject
-- (the error isn't checked there, so the slip's own status update still
-- succeeded, but no tradie was ever actually notified).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reward_slip_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reward_slip_rejected';
