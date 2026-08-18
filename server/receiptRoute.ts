import type { Express } from "express";
import { getActiveDiagnosticReceiptByToken } from "./db";
import { storageGetSignedUrl } from "./storage";

export function registerReceiptRoute(app: Express) {
  app.get("/api/receipt/:token", async (req, res) => {
    try {
      const receipt = await getActiveDiagnosticReceiptByToken(req.params.token);
      if (!receipt) {
        res.status(410).send("Este link de comprovante expirou ou não está disponível.");
        return;
      }
      const downloadUrl = await storageGetSignedUrl(receipt.receiptStorageKey!);
      res.redirect(302, downloadUrl);
    } catch (error) {
      console.error("[Receipt] Download failed:", error);
      res.status(500).send("Não foi possível preparar o comprovante agora.");
    }
  });
}
