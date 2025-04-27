<template>
  <div class="app-container">
    <header>
      <sl-card class="nav-card">
        <nav>
          <sl-button-group label="Navigation">
            <sl-button variant="primary" href="/" @click.prevent="navigate('/')">Home</sl-button>
            <sl-button variant="primary" href="/about" @click.prevent="navigate('/about')">About</sl-button>
            <sl-button variant="primary" href="/contact" @click.prevent="navigate('/contact')">Contact</sl-button>
          </sl-button-group>
        </nav>
      </sl-card>
    </header>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  methods: {
    navigate(route) {
      this.$router.push(route);
    }
  }
}
</script>

<style>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

header {
  margin-bottom: 2rem;
}

.nav-card {
  --padding: 1rem;
}

nav {
  display: flex;
  justify-content: center;
}

main {
  margin-top: 2rem;
}
</style>
