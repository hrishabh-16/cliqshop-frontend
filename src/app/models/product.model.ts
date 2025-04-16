// Export the User model to make it a module
export class User {
    userId: number = 0;
    name: string = '';
    username: string = '';
    email: string = '';
    password?: string = '';
    phoneNumber?: string;
    role: string = '';
    active: boolean = false;
  }