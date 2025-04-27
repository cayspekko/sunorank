<template>
  <div class="contact">
    <sl-card class="page-card">
      <h1 slot="header">Contact Page</h1>
      <p>Get in touch with us using the form below:</p>
      
      <form class="contact-form" @submit.prevent="handleSubmit">
        <sl-input label="Name" placeholder="Your name" required></sl-input>
        <sl-input type="email" label="Email" placeholder="Your email" required></sl-input>
        <sl-textarea label="Message" placeholder="Your message" rows="4" required></sl-textarea>
        <sl-button type="submit" variant="success">Send Message</sl-button>
      </form>
      
      <sl-divider></sl-divider>
      
      <div class="contact-info">
        <sl-card>
          <strong slot="header">Contact Information</strong>
          <sl-icon-button name="geo-alt-fill" label="Location"></sl-icon-button> 123 Vue Street, Web City
          <br>
          <sl-icon-button name="envelope-fill" label="Email"></sl-icon-button> hello@example.com
          <br>
          <sl-icon-button name="telephone-fill" label="Phone"></sl-icon-button> (123) 456-7890
        </sl-card>
      </div>
    </sl-card>
  </div>
</template>

<script>
export default {
  name: 'ContactPage',
  methods: {
    handleSubmit() {
      alert('Form submitted! (This is just a demo)');
    }
  }
}
</script>

<style scoped>
.contact {
  text-align: center;
}

.page-card {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
}

p {
  margin-bottom: 1rem;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 500px;
  margin: 2rem auto;
}

.contact-info {
  margin-top: 2rem;
  text-align: left;
}

sl-icon-button {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}
</style>
