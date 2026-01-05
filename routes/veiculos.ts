import { Router } from "express";
import { prisma } from "../db";
import crypto from "crypto";

const router = Router();

/* ======================================================
    ALL — LISTAR TODOS VEÍCULOS (ADMIN / DASHBOARD)
    GET /api/veiculos/all
====================================================== */
router.get("/all", async (_req, res) => {
  try {
    const veiculos = await prisma.entrada.findMany({
      include: {
        vaga: true,
        filial: true,
        veiculo: true,
      },
      orderBy: { dataEntrada: "desc" },
    });

    return res.json(veiculos);
  } catch (error) {
    console.error("Erro ao listar todos os veículos:", error);
    return res.status(500).json({ error: "Erro ao listar veículos" });
  }
});

/* ======================================================
    LISTAR VEÍCULOS ATIVOS POR FILIAL
    GET /api/veiculos/ativos?filialId=xxxx
====================================================== */
router.get("/ativos", async (req, res) => {
  try {
    const { filialId } = req.query;

    if (!filialId) {
      return res.status(400).json({ error: "filialId é obrigatório" });
    }

    const veiculos = await prisma.entrada.findMany({
      where: {
        filialId: String(filialId),
        dataSaida: null,
        status: "ativo",
      },
      include: {
        vaga: true,
        filial: true,
        veiculo: true,
      },
      orderBy: { dataEntrada: "desc" },
    });

    res.json(veiculos);
  } catch (error) {
    console.error("Erro ao listar veículos ativos:", error);
    res.status(500).json({ error: "Erro ao listar veículos ativos" });
  }
});

/* ======================================================
    HISTÓRICO DO DIA
    GET /api/veiculos/historico?filialId=xxxx&data=yyyy-mm-dd
====================================================== */
router.get("/historico", async (req, res) => {
  try {
    const { filialId, data } = req.query;

    if (!filialId) {
      return res.status(400).json({ error: "filialId é obrigatório" });
    }

    const dia = data ? new Date(String(data)) : new Date();

    const inicio = new Date(dia);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(dia);
    fim.setHours(23, 59, 59, 999);

    const historico = await prisma.entrada.findMany({
      where: {
        filialId: String(filialId),
        dataEntrada: { gte: inicio, lte: fim },
      },
      include: {
        vaga: true,
        filial: true,
        veiculo: true,
      },
      orderBy: { dataEntrada: "desc" },
    });

    res.json(historico);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

/* ======================================================
    BUSCAR ÚLTIMO REGISTRO POR PLACA
    GET /api/veiculos/buscar/:placa
====================================================== */
router.get("/buscar/:placa", async (req, res) => {
  try {
    const { placa } = req.params;

    const veiculo = await prisma.entrada.findFirst({
      where: {
        placaCavalo: { equals: placa, mode: "insensitive" },
      },
      include: { veiculo: true },
      orderBy: { id: "desc" },
    });

    if (!veiculo) {
      return res.json({ encontrado: false });
    }

    return res.json({
      encontrado: true,
      ultimaEntrada: veiculo,
    });
  } catch (error) {
    console.error("Erro ao buscar veículo:", error);
    res.status(500).json({ error: "Erro ao buscar veículo" });
  }
});

/* ======================================================
    LISTAR TODOS VEÍCULOS DA FILIAL
    GET /api/veiculos?filialId=xxxx
====================================================== */
router.get("/", async (req, res) => {
  try {
    const { filialId } = req.query;

    if (!filialId) {
      return res.status(400).json({ error: "filialId é obrigatório" });
    }

    const veiculos = await prisma.entrada.findMany({
      where: { filialId: String(filialId) },
      include: {
        vaga: true,
        filial: true,
        veiculo: true,
      },
      orderBy: { dataEntrada: "desc" },
    });

    res.json(veiculos);
  } catch (error) {
    console.error("Erro ao listar veículos:", error);
    res.status(500).json({ error: "Erro ao listar veículos" });
  }
});

/* ======================================================
    DETALHES DO VEÍCULO
    GET /api/veiculos/:id
====================================================== */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const veiculo = await prisma.entrada.findUnique({
      where: { id: Number(id) },
      include: {
        vaga: true,
        filial: true,
        veiculo: true,
      },
    });

    if (!veiculo) {
      return res.status(404).json({ error: "Veículo não encontrado" });
    }

    res.json(veiculo);
  } catch (error) {
    console.error("Erro ao buscar veículo:", error);
    res.status(500).json({ error: "Erro ao buscar veículo" });
  }
});

/* ======================================================
    REGISTRAR SAÍDA DO VEÍCULO
    PATCH /api/veiculos/:id/saida
====================================================== */
router.patch("/:id/saida", async (req, res) => {
  try {
    const { id } = req.params;
    const { cte, nf, lacre } = req.body;

    const saida = await prisma.entrada.update({
      where: { id: Number(id) },
      data: {
        dataSaida: new Date(),
        status: "finalizado",
        cte,
        nf,
        lacre,
      },
    });

    if (saida.vagaId) {
      await prisma.vaga.update({
        where: { id: saida.vagaId },
        data: { status: "livre" },
      });
    }

    res.json(saida);
  } catch (error) {
    console.error("Erro ao registrar saída:", error);
    res.status(500).json({ error: "Erro ao registrar saída" });
  }
});

/* ======================================================
    CADASTRAR VEÍCULO (ENTRADA NO PÁTIO)
    POST /api/veiculos
====================================================== */
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const vagaIdRaw = data.vagaId ?? data.vaga?.id;
    const vagaId = Number(vagaIdRaw);

    if (!data.filialId || !data.placaCavalo || !data.motorista) {
      return res.status(400).json({
        error: "filialId, placaCavalo e motorista são obrigatórios",
      });
    }

    if (!Number.isInteger(vagaId) || vagaId <= 0) {
      return res.status(400).json({ error: "vagaId inválido" });
    }

    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
    });

    if (!vaga) {
      return res.status(400).json({ error: "Vaga não encontrada" });
    }

    let veiculo = await prisma.veiculo.findFirst({
    where: { placaCavalo: data.placaCavalo },
  });

    if (!veiculo) {
   veiculo = await prisma.veiculo.create({
    data: {
    placaCavalo: data.placaCavalo,
    motorista: data.motorista,
    filialId: data.filialId,
    cliente: data.cliente ?? null,
    transportadora: data.transportadora ?? null,
    cpfMotorista: data.cpfMotorista ?? null,

        },
      });
    }

    const entrada = await prisma.entrada.create({
      data: {
        filialId: data.filialId,
        vagaId,
        veiculoId: veiculo.id,

        placaCavalo: data.placaCavalo,
        placaCarreta: data.placaCarreta || null,
        motorista: data.motorista,
        proprietario: data.proprietario || null,
        tipo: data.tipo || "entrada",
        tipoVeiculoCategoria: data.tipoVeiculoCategoria || null,
        tipoProprietario: data.tipoProprietario || null,
        cliente: data.cliente || null,
        transportadora: data.transportadora || null,
        statusCarga: data.statusCarga || null,
        doca: data.doca || null,
        valor: data.valor ? Number(data.valor) : null,
        cte: data.cte || null,
        nf: data.nf || null,
        lacre: data.lacre || null,
        cpfMotorista: data.cpfMotorista || null,
        observacoes: data.observacoes || null,
        multi: data.multi ?? false,
        status: "ativo",
      },
    });

    await prisma.vaga.update({
      where: { id: vagaId },
      data: { status: "ocupada" },
    });

    return res.json({
      sucesso: true,
      mensagem: "Veículo registrado no pátio",
      entrada,
      veiculo,
    });
  } catch (error) {
    console.error("Erro ao cadastrar veículo:", error);
    return res.status(500).json({ error: "Erro ao registrar veículo" });
  }
});



/* ======================================================
   FINALIZAR ENTRADA (SOFT DELETE)
   DELETE /api/veiculos/:id
====================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id); // ← ID DA ENTRADA

    const entrada = await prisma.entrada.update({
      where: { id },
      data: {
        dataSaida: new Date(),
        status: "finalizado",
      },
    });

    // libera vaga se existir
    if (entrada.vagaId) {
      await prisma.vaga.update({
        where: { id: entrada.vagaId },
        data: { status: "livre" },
      });
    }

    return res.json({
      sucesso: true,
      mensagem: "Entrada finalizada com sucesso",
      entrada,
    });
  } catch (error) {
    console.error("Erro ao finalizar entrada:", error);
    return res.status(500).json({
      error: "Erro ao remover veículo do pátio",
    });
  }
});





export default router;
