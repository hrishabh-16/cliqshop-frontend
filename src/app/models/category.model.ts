export class Category {
    id: number;
    name: string;
    description: string;
    
    
    constructor(id: number, name: string, description: string, parentId: number | null, createdAt: Date, updatedAt: Date) {
        this.id = id;
        this.name = name;
        this.description = description;
    
    }
}