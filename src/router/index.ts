import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
// import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Contact from '../views/Contact.vue'
import Profile from '../views/Profile.vue'
import Dashboard from '../views/Dashboard.vue'
import PlaylistView from '../views/PlaylistView.vue'
import VoteView from '../views/VoteView.vue'
import OverlayView from '../views/OverlayView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Dashboard
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/contact',
    name: 'Contact',
    component: Contact
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/playlist/:id',
    name: 'Playlist',
    component: PlaylistView,
    props: true
  },
  {
    path: '/vote/:id',
    name: 'Vote',
    component: VoteView,
    props: true
  },
  {
    path: '/overlay/:id',
    name: 'Overlay',
    component: OverlayView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
