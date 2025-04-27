<template>
  <div class="contact">
    <n-card class="page-card">
      <template #header>
        <h1>Contact Page</h1>
      </template>
      <p>Get in touch with us using the form below:</p>
      
      <n-form ref="formRef" :model="formValue" class="contact-form" @submit.prevent="handleSubmit">
        <n-form-item label="Name" path="name">
          <n-input v-model:value="formValue.name" placeholder="Your name" />
        </n-form-item>
        <n-form-item label="Email" path="email">
          <n-input v-model:value="formValue.email" placeholder="Your email" />
        </n-form-item>
        <n-form-item label="Message" path="message">
          <n-input
            v-model:value="formValue.message"
            type="textarea"
            placeholder="Your message"
            :rows="4"
          />
        </n-form-item>
        <n-button type="success" @click="handleSubmit">Send Message</n-button>
      </n-form>
      
      <n-divider />
      
      <div class="contact-info">
        <n-card>
          <template #header>
            <strong>Contact Information</strong>
          </template>
          <n-space vertical>
            <n-space>
              <n-icon size="18">
                <location-outline />
              </n-icon>
              123 Vue Street, Web City
            </n-space>
            <n-space>
              <n-icon size="18">
                <mail-outline />
              </n-icon>
              hello@example.com
            </n-space>
            <n-space>
              <n-icon size="18">
                <call-outline />
              </n-icon>
              (123) 456-7890
            </n-space>
          </n-space>
        </n-card>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LocationOutline, MailOutline, CallOutline } from '@vicons/ionicons5'

interface FormData {
  name: string;
  email: string;
  message: string;
}

// Define reactive state
const formRef = ref(null)
const formValue = ref<FormData>({
  name: '',
  email: '',
  message: ''
})

// Define methods
const handleSubmit = (): void => {
  alert('Form submitted! (This is just a demo)')
}

// Component name is automatically inferred from filename
// No need to register components - they're automatically available in the template
</script>

<style scoped>
.contact {
  text-align: center;
}

.contact-form {
  max-width: 1200px;
  margin: 1.5rem auto;
}

.contact-info {
  margin-top: 1.5rem;
  text-align: left;
}
</style>
