<template>
  <el-container class="container">
    <el-aside width="200px">
      <el-menu
        :default-active="activeRoute"
        class="menu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>配置中心</span>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Document /></el-icon>
          <span>运行日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Setting, Document } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const activeRoute = ref('/settings')

// 监听路由变化
onMounted(() => {
  activeRoute.value = route.path || '/settings'
})

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  activeRoute.value = index
  router.push(index)
}
</script>

<style scoped>
.container {
  height: 100vh;
}

.menu {
  height: 100%;
}

.main-content {
  padding: 20px;
  background-color: #f5f5f5;
}
</style>