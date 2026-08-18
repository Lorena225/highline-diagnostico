import { describe, expect, it } from "vitest";
import { isSupportedMaterialFile, MAX_MATERIAL_FILE_BYTES } from "../shared/materials";

describe("validação de materiais de apoio", () => {
  it("aceita documentos institucionais e imagens nos formatos permitidos", () => {
    expect(isSupportedMaterialFile({ name: "proposta.pdf", type: "application/pdf", size: 1_200 })).toBe(true);
    expect(isSupportedMaterialFile({ name: "campanha.png", type: "image/png", size: 1_200 })).toBe(true);
  });

  it("rejeita formatos não permitidos e arquivos acima do limite", () => {
    expect(isSupportedMaterialFile({ name: "dados.exe", type: "application/octet-stream", size: 1_200 })).toBe(false);
    expect(isSupportedMaterialFile({ name: "video.mov", type: "video/quicktime", size: 1_200 })).toBe(false);
    expect(isSupportedMaterialFile({ name: "arquivo.pdf", type: "application/pdf", size: MAX_MATERIAL_FILE_BYTES + 1 })).toBe(false);
  });
});
