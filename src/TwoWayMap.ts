export class TwoWayMap<T, V> {
  protected leftRight = new Map<T, V>();
  protected rightLeft = new Map<V, T>();

  public get size() {
    return this.leftRight.size;
  }

  public set(key: T, value: V) {
    this.leftRight.set(key, value);
    this.rightLeft.set(value, key);
  }

  public delete(key: T) {
    let deleteCount = 0;
    const value = this.leftRight.get(key);
    if (value) {
      deleteCount += Number(this.rightLeft.delete(value));
    }
    deleteCount += Number(this.leftRight.delete(key));
    return deleteCount === 2;
  }

  public deleteByValue(value: V) {
    let deleteCount = 0;
    const key = this.rightLeft.get(value);
    if (key) {
      deleteCount += Number(this.leftRight.delete(key));
    }
    deleteCount += Number(this.rightLeft.delete(value));
    return deleteCount === 2;
  }

  public get(key: T) {
    return this.leftRight.get(key);
  }

  public getByValue(value: V) {
    return this.rightLeft.get(value);
  }

  public clear() {
    this.leftRight.clear();
    this.rightLeft.clear();
  }
}
