<template>
  <div class="home">
    <sl-card class="page-card">
      <div slot="header">
        <h1>Home Page</h1>
      </div>
      <p>Welcome to our Vue 3 application with Shoelace components!</p>
      <p>This is a simple demonstration of a multi-page application using Vue Router and Shoelace UI library.</p>
      <sl-divider></sl-divider>
      <sl-alert variant="primary" open>
        <sl-icon slot="icon" name="info-circle"></sl-icon>
        <strong>Hello World!</strong><br>
        This is the home page of our application.
      </sl-alert>
    </sl-card>
    <sl-input v-model="test" label="Test input"></sl-input>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<style scoped>
.home {
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
</style>
