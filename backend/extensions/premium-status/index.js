export default (router, { services, database, getSchema }) => {
  const { UsersService } = services;
  const TRIAL_DAYS = 7;

  router.patch("/me", async (req, res) => {
    try {
      if (!req.accountability?.user) {
        return res.status(401).json({ errors: [{ message: "Unauthorized" }] });
      }

      const active = Boolean(req.body?.premium_active);
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + TRIAL_DAYS);
      const schema = await getSchema();
      const usersService = new UsersService({
        database,
        schema,
        accountability: null,
      });

      const user = await usersService.updateOne(req.accountability.user, {
        premium_active: active,
        premium_plan: active ? "trial" : null,
        premium_until: active ? premiumUntil.toISOString() : null,
      });

      return res.json({ data: user });
    } catch (err) {
      const message = err?.message ?? "Failed to update premium status";
      return res.status(500).json({ errors: [{ message }] });
    }
  });
};
