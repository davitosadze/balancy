export default (router, { services, database, getSchema }) => {
  const { UsersService } = services;
  const USER_FIELDS = [
    "id",
    "email",
    "first_name",
    "last_name",
    "avatar",
    "premium_active",
    "premium_plan",
    "premium_until",
  ];

  router.get("/me", async (req, res) => {
    try {
      if (!req.accountability?.user) {
        return res.status(401).json({ errors: [{ message: "Unauthorized" }] });
      }

      const schema = await getSchema();
      const usersService = new UsersService({
        database,
        schema,
        accountability: null,
      });

      const user = await usersService.readOne(req.accountability.user, {
        fields: USER_FIELDS,
      });

      return res.json({ data: user });
    } catch (err) {
      const message = err?.message ?? "Failed to fetch account profile";
      return res.status(500).json({ errors: [{ message }] });
    }
  });
};
