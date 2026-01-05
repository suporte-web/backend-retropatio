import { Router } from "express";

const notificacoesRouter = Router();

// banco fake só pra teste (memória)
let notifications: any[] = [];

notificacoesRouter.get("/unread-count", (_req, res) => {
  const count = notifications.filter(n => n.status === "nao_lida").length;
  return res.json({ count });
});

notificacoesRouter.get("/", (_req, res) => {
  return res.json(notifications);
});

notificacoesRouter.patch("/:id/read", (req, res) => {
  const { id } = req.params;
  const notification = notifications.find(n => n.id === id);

  if (!notification) {
    return res.status(404).json({ error: "Notificação não encontrada" });
  }

  notification.status = "lida";
  return res.json({ ok: true });
});

notificacoesRouter.patch("/read-all", (_req, res) => {
  notifications = notifications.map(n => ({
    ...n,
    status: "lida",
  }));

  return res.json({ ok: true });
});

notificacoesRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  notifications = notifications.filter(n => n.id !== id);
  return res.json({ ok: true });
});

// rota de teste (IMPORTANTE pra você ver funcionando)
notificacoesRouter.post("/mock", (_req, res) => {
  notifications.unshift({
    id: String(Date.now()),
    titulo: "Teste",
    mensagem: "Notificação de teste",
    status: "nao_lida",
    actionUrl: "/",
    createdAt: new Date().toISOString(),
  });

  return res.json({ ok: true });
});

export default notificacoesRouter;
