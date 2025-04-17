// cliqshop-frontend\src\app\models\category.model.ts
export class Category {
    categoryId: number;  // Main identifier
    id: number;          // Backup identifier (for API inconsistency)
    name: string;
    description: string;
  
    constructor(
      id: number,
      name: string,
      description: string,
      parentId: number | null = null,
      createdAt: Date = new Date(),
      updatedAt: Date = new Date()
    ) {
      this.id = id;
      this.categoryId = id; // Ensure both properties have the same value
      this.name = name;
      this.description = description;
    }
  }