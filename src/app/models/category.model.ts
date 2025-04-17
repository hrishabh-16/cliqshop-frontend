// cliqshop-frontend\src\app\models\category.model.ts
export class Category {
  categoryId: number;
  id: number; // For backwards compatibility
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string; // Added for UI but not stored in backend

  constructor(
    id: number,
    name: string,
    description: string,
    parentId: number | null = null,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    imageUrl?: string
  ) {
    this.id = id;
    this.categoryId = id; // Ensure both properties have the same value
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.imageUrl = imageUrl;
  }
}