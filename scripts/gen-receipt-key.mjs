import { exportPKCS8, generateKeyPair } from "jose";

const { privateKey } = await generateKeyPair("EdDSA", { extractable: true });
const pem = await exportPKCS8(privateKey);
process.stdout.write(Buffer.from(pem, "utf8").toString("base64"));
