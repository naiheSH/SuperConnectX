// vitest 中 mock electron-store 模块，提供最小 Store 实现
// 用于测试各种 Storage 类

export default class Store<T extends Record<string, any> = Record<string, any>> {
  private _store: Record<string, any>

  constructor(options?: { name?: string; cwd?: string; defaults?: T }) {
    this._store = { ...(options?.defaults || {}) }
  }

  get store(): Record<string, any> {
    return { ...this._store }
  }

  get<K extends string>(key: K, defaultValue?: any): any {
    return key in this._store ? this._store[key] : defaultValue
  }

  set<K extends string>(key: K, value: any): void {
    this._store[key] = value
  }

  delete(key: string): void {
    delete this._store[key]
  }

  clear(): void {
    this._store = {}
  }
}
