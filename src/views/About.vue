<template>
  <div class="about">
    <sl-card class="page-card">
      <div slot="header">
        <h1>About Page</h1>
      </div>
      <p>This is the About page of our Vue 3 application with Shoelace components.</p>
      <sl-divider></sl-divider>
      <sl-details summary="About this project" open>
        <p>This is a basic Vue.js 3 application built with:</p>
        <sl-tag variant="neutral">Vue 3</sl-tag>
        <sl-tag variant="success">Vite</sl-tag>
        <sl-tag variant="info">Shoelace UI</sl-tag>
        <sl-tag variant="warning">Vue Router</sl-tag>
        <p class="mt-1">It demonstrates a multi-page application with navigation between different views.</p>
      </sl-details>
    </sl-card>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>

<style scoped>
.about {
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

.mt-1 {
  margin-top: 1rem;
}

sl-tag {
  margin-right: 0.5rem;
}
</style>
