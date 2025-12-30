import { Router } from "express";
import { prisma } from "../db";

const router = Router();

/* ======================================================
   1) LISTAR FORNECEDORES
   GET /api/fornecedores
====================================================== */
router.get("/", async (_req, res) => {
  try {
    const fornecedores = await prisma.fornecedor.findMany({
      orderBy: { nome: "asc" },
    });

    res.json(fornecedores);
  } catch (error) {
    console.error("Erro ao listar fornecedores:", error);
    res.status(500).json({ error: "Erro ao listar fornecedores" });
  }
});

/* ======================================================
   2) CRIAR FORNECEDOR
   POST /api/fornecedores
====================================================== */
router.post("/", async (req, res) => {
  try {
    const { nome, cnpj, ativo } = req.body;

    if (!nome || !cnpj) {
      return res.status(400).json({
        error: "Nome e CNPJ são obrigatórios",
      });
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome,
        cnpj,
        ativo: ativo ?? true,
      },
    });

    res.status(201).json(fornecedor);
  } catch (error: any) {
    // CNPJ duplicado (constraint do banco)
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "CNPJ já cadastrado",
      });
    }

    console.error("Erro ao criar fornecedor:", error);
    res.status(500).json({ error: "Erro ao criar fornecedor" });
  }
});

/* ======================================================
   3) ATUALIZAR FORNECEDOR
   PATCH /api/fornecedores/:id
====================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, ativo } = req.body;

    const fornecedor = await prisma.fornecedor.update({
      where: { id },
      data: {
        nome,
        cnpj,
        ativo,
      },
    });

    res.json(fornecedor);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Fornecedor não encontrado",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        error: "CNPJ já cadastrado",
      });
    }

    console.error("Erro ao atualizar fornecedor:", error);
    res.status(500).json({ error: "Erro ao atualizar fornecedor" });
  }
});

/* ======================================================
   4) REMOVER FORNECEDOR
   DELETE /api/fornecedores/:id
====================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.fornecedor.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Fornecedor não encontrado",
      });
    }

    console.error("Erro ao remover fornecedor:", error);
    res.status(500).json({ error: "Erro ao remover fornecedor" });
  }
});

export default router;
