# XSS Test

This tests that raw HTML is properly escaped or filtered.

<script>alert('XSS')</script>

<img src=x onerror=alert('XSS')>

<a href="javascript:alert('XSS')">Click me</a>

<style>body { background: red; }</style>
