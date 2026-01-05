import { Router } from "express";
import { prisma } from "../db";

const router = Router();

/* ======================================================
   GET /api/chamadas?filialId=xxx
====================================================== */
router.get("/", async (req, res) => {
  try {
    const { filialId, status } = req.query;

    if (!filialId) {
      return res.status(400).json({ error: "filialId é obrigatório" });
    }

    const chamadas = await prisma.chamada.findMany({
      where: {
        filialId: String(filialId),
        ...(status ? { status: String(status) } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(chamadas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar chamadas" });
  }
});


/* ======================================================
   POST /api/chamadas
====================================================== */
router.post("/", async (req, res) => {
  try {
    const { filialId, veiculoId, motivo } = req.body;

    // 🔒 usuário autenticado
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!filialId || !veiculoId || !motivo) {
      return res.status(400).json({
        error: "filialId, veiculoId e motivo são obrigatórios",
      });
    }

    const chamada = await prisma.chamada.create({
      data: {
        filialId,
        veiculoId: Number(veiculoId),
        motivo,
        status: "pendente",

        // 👇 DECIDIDO PELO BACKEND
        criadoPorRole: user.role,
        criadoPorUserId: user.id,
      },
    });

    return res.status(201).json(chamada);
  } catch (error) {
    console.error("Erro ao criar chamada:", error);
    return res.status(500).json({
      error: "Erro ao criar chamada",
    });
  }
});

/* ======================================================
   PATCH /api/chamadas/:id/atender
====================================================== */
router.patch("/:id/atender", async (req, res) => {
  try {
    const { id } = req.params;

    const chamada = await prisma.chamada.update({
      where: { id: Number(id) },
      data: {
        status: "atendida",
        dataAtendimento: new Date(),
      },
    });

    res.json(chamada);
  } catch (error) {
    console.error("Erro ao atender chamada:", error);
    res.status(500).json({ error: "Erro ao atender chamada" });
  }
});

export default router;
