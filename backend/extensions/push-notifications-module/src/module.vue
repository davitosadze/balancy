<template>
  <private-view title="Push Notifications" :small-header="true">
    <template #headline>
      <v-breadcrumb :items="[{ name: 'Push Notifications', to: '/push-notifications' }]" />
    </template>

    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="notifications_active" />
      </v-button>
    </template>

    <div class="push-tester">
      <!-- Users panel -->
      <v-card class="panel">
        <div class="panel-header">
          <v-icon name="people" small />
          <span>Users with Push Token</span>
        </div>
        <div class="panel-body">
          <v-button small outlined :loading="loadingUsers" @click="loadUsers">
            <v-icon name="refresh" small left /> Refresh Users
          </v-button>

          <div v-if="users.length === 0 && !loadingUsers" class="empty-msg">
            No users with push tokens found. Open the app on a real device first to register a token.
          </div>

          <div v-for="u in users" :key="u.id" class="user-row" @click="selectUser(u)">
            <v-avatar :size="36">
              <v-icon name="person" />
            </v-avatar>
            <div class="user-info">
              <span class="user-name">{{ u.first_name || '' }} {{ u.last_name || u.email }}</span>
              <span class="user-token">{{ u.push_token }}</span>
            </div>
            <v-chip v-if="form.token === u.push_token" small color="primary">Selected</v-chip>
          </div>
        </div>
      </v-card>

      <!-- Compose panel -->
      <v-card class="panel">
        <div class="panel-header">
          <v-icon name="edit_notifications" small />
          <span>Compose Notification</span>
        </div>
        <div class="panel-body">
          <div class="field-group">
            <div class="type-label">Expo Push Token</div>
            <v-input v-model="form.token" placeholder="ExponentPushToken[…]" />
          </div>

          <div class="field-group">
            <div class="type-label">Title</div>
            <v-input v-model="form.title" placeholder="Notification title" />
          </div>

          <div class="field-group">
            <div class="type-label">Body</div>
            <v-textarea v-model="form.body" placeholder="Notification message…" :rows="3" />
          </div>

          <div class="field-row">
            <div class="field-group half">
              <div class="type-label">Sound</div>
              <v-select v-model="form.sound" :items="soundOptions" />
            </div>
            <div class="field-group half">
              <div class="type-label">Extra data (JSON)</div>
              <v-input v-model="form.data" placeholder='{"key": "value"}' />
            </div>
          </div>

          <v-button :loading="sending" :disabled="!form.token || !form.body" @click="send">
            <v-icon name="send" small left /> Send Notification
          </v-button>
        </div>
      </v-card>

      <!-- Result panel -->
      <v-card v-if="result" class="panel">
        <div class="panel-header">
          <v-icon :name="resultOk ? 'check_circle' : 'error'" small :style="{ color: resultOk ? 'var(--success)' : 'var(--danger)' }" />
          <span>{{ resultOk ? 'Sent Successfully' : 'Error' }}</span>
        </div>
        <div class="panel-body">
          <pre class="result-code">{{ result }}</pre>
        </div>
      </v-card>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

interface DirectusUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  push_token: string;
}

const api = useApi();

const users = ref<DirectusUser[]>([]);
const loadingUsers = ref(false);
const sending = ref(false);
const result = ref('');
const resultOk = ref(false);

const form = reactive({
  token: '',
  title: '💰 LoansApp',
  body: '',
  sound: 'default',
  data: '',
});

const soundOptions = [
  { text: 'Default', value: 'default' },
  { text: 'None', value: '' },
];

async function loadUsers() {
  loadingUsers.value = true;
  result.value = '';
  try {
    const res = await api.get('/users', {
      params: {
        filter: { push_token: { _nnull: true } },
        fields: ['id', 'email', 'first_name', 'last_name', 'push_token'],
        limit: -1,
      },
    });
    users.value = res.data?.data ?? [];
  } catch (e: any) {
    users.value = [];
  } finally {
    loadingUsers.value = false;
  }
}

function selectUser(u: DirectusUser) {
  form.token = u.push_token;
}

async function send() {
  if (!form.token || !form.body) return;

  let data: Record<string, unknown> = {};
  if (form.data.trim()) {
    try {
      data = JSON.parse(form.data);
    } catch {
      result.value = 'Error: Extra data is not valid JSON';
      resultOk.value = false;
      return;
    }
  }

  sending.value = true;
  result.value = '';

  try {
    const payload: Record<string, unknown> = {
      to: form.token,
      title: form.title,
      body: form.body,
      data,
    };
    if (form.sound) payload.sound = form.sound;

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    resultOk.value = json?.data?.status === 'ok';
    result.value = JSON.stringify(json, null, 2);
  } catch (e: any) {
    resultOk.value = false;
    result.value = 'Error: ' + (e?.message ?? 'Unknown error');
  } finally {
    sending.value = false;
  }
}

onMounted(loadUsers);
</script>

<style scoped>
.push-tester {
  padding: var(--content-padding);
  padding-top: var(--content-padding-top);
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 720px;
}

.panel {
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 14px;
  color: var(--foreground-normal-alt);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-row {
  display: flex;
  gap: 16px;
}

.field-group.half {
  flex: 1;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--border-radius);
  border: var(--border-width) solid var(--border-normal);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.user-row:hover {
  border-color: var(--primary);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
}

.user-token {
  font-size: 11px;
  color: var(--foreground-subdued);
  font-family: var(--family-monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-msg {
  font-size: 13px;
  color: var(--foreground-subdued);
  text-align: center;
  padding: 16px 0;
}

.result-code {
  font-family: var(--family-monospace);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--foreground-normal);
  background: var(--background-subdued);
  padding: 12px;
  border-radius: var(--border-radius);
  margin: 0;
}
</style>
