import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
  id: 'push-notifications',
  name: 'Push Notifications',
  icon: 'notifications_active',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
  ],
});
