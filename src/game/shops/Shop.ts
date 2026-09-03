import { IShop, IProduct, IVector3 } from '@/types/game';

export class Shop {
  public data: IShop;

  constructor(data: IShop) {
    this.data = data;
  }

  public getId(): string {
    return this.data.id;
  }

  public getName(): string {
    return this.data.name;
  }

  public getProducts(): IProduct[] {
    return this.data.products;
  }

  public isPlayerInsideTrigger(playerPos: IVector3): boolean {
    const dx = playerPos.x - this.data.position.x;
    const dz = playerPos.z - this.data.position.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= this.data.triggerRadius * this.data.triggerRadius;
  }
}
