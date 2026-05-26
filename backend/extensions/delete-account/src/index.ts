import { defineEndpoint } from '@directus/extensions-sdk';

export default defineEndpoint((router, { services, database, getSchema }) => {
  const { UsersService } = services;

  router.delete('/me', async (req: any, res: any) => {
    try {
      if (!req.accountability?.user) {
        return res.status(401).json({ errors: [{ message: 'Unauthorized' }] });
      }

      const userId: string = req.accountability.user;
      const schema = await getSchema();

      // Use null accountability (admin-level) so Directus system restrictions
      // on self-deletion don't block the operation.
      const usersService = new UsersService({ database, schema, accountability: null });
      await usersService.deleteOne(userId);

      return res.status(204).end();
    } catch (err: any) {
      const message = err?.message ?? 'Failed to delete account';
      return res.status(500).json({ errors: [{ message }] });
    }
  });
});
