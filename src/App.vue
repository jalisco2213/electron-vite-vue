<script lang="ts" setup>
import { version } from '../package.json';

const commitHash = __COMMIT_HASH__ || 'N/A';
</script>

<template>
  <div class="container">
    Version: {{ version }}
    Commit: {{ commitHash }}
  </div>
</template>