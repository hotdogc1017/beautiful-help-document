import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  rules: {
    "ts/ban-ts-comment": "off"
  }
})
