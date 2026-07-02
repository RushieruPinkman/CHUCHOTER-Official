import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("VAPID keys generated. Add these to .env.local and Vercel:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:your-email@example.com");
