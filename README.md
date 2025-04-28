# CliQshop Frontend


## 📌 Project Overview

CliQshop is a modern e-commerce platform built with Angular. The frontend provides a responsive and intuitive interface for both customers and administrators. This repository contains the frontend application which interfaces with the [CliQshop Backend](https://github.com/hrishabh-16/cliqshop-backend.git).

## ✨ Features

### Customer Features
- **Product Browsing**: Browse products by categories with search and filter capabilities
- **User Authentication**: Secure login/registration with JWT authentication
- **Shopping Cart**: Add/remove products with real-time cart updates
- **Checkout Process**: Streamlined multi-step checkout with address management
- **Payment Integration**: Secure payments using Stripe
- **Order Management**: View order history and track current orders
- **User Profile**: Update personal information and manage addresses


### Admin Features
- **Dashboard**: Analytics overview with Recents Products, Users , Orders and Categories 
- **Product Management**: Add, edit, delete products and manage products
- **Category Management**: Create and organize product categories
- **Inventory Management**: Add, edit, delete products and manage inventory including Low stock Management and Warehouse Management
- **Order Processing**: View, update, and manage customer orders
- **User Management**: View and manage user accounts
- **Reporting**: Analytics overview with sales and inventory metrics using charts

## 🧩 Components

### Customer Side Components
- **Home**: Landing page showcasing featured products
- **Products**: Product listing with filters and search
- **Product Detail**: Detailed product information and add to cart functionality
- **Cart**: Shopping cart management
- **Categories**: Browse products by category
- **Checkout**: Multi-step checkout process
- **Order Confirmation**: Order success page
- **Profile**: User profile management
- **Login/Register**: User authentication forms

### Admin Side Components
- **Dashboard**: Admin analytics dashboard
- **Inventory**: Inventory management interface
- **Orders**: Order processing and management
- **Categories**: Category management
- **Products**: Product management
- **Users**: User account management
- **Reports**: Sales and inventory reports

## 🏗️ Project Structure

```
cliqshop-frontend/
├── .angular/           # Angular configuration
├── node_modules/       # Dependencies
├── src/                # Source files
│   ├── app/            # Application code
│   │   ├── components/ # Reusable components
│   │   │   ├── admin/  # Admin-specific components
│   │   │   │   ├── categories/    # Categories management
│   │   │   │   ├── dashboard/     # Admin dashboard
│   │   │   │   ├── inventory/     # Inventory management
│   │   │   │   ├── orders/        # Order management
│   │   │   │   ├── products/      # Product management
│   │   │   │   ├── profile/       # Admin profile
│   │   │   │   ├── reports/       # Report generation
│   │   │   │   └── users/         # User management
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── cart/              # Shopping cart
│   │   │   ├── categories/        # Category browsing
│   │   │   ├── checkout/          # Checkout process
│   │   │   ├── home-component/    # Home page
│   │   │   ├── order-confirmation/ # Order confirmation
│   │   │   ├── orders/            # Order history
│   │   │   ├── payment/           # Payment processing
│   │   │   ├── product-detail/    # Product details
│   │   │   ├── products/          # Product listings
│   │   │   └── user-profile/      # User profile
│   │   ├── guards/                # Route guards
│   │   │   ├── admin/             # Admin route guards
│   │   │   └── auth/              # Authentication guards
│   │   ├── interceptors/          # HTTP interceptors
│   │   │   ├── auth/              # Auth interceptors
│   │   │   └── error/             # Error handling
│   │   ├── models/                # Data models
│   │   └── services/              # API services
│   │       ├── admin/             # Admin services
│   │       ├── auth/              # Auth services
│   │       ├── cart/              # Cart services
│   │       └── ...                # Other services
│   ├── assets/         # Static assets
│   ├── styles.css      # Global styles
│   ├── main.ts         # Main entry point
│   └── index.html      # Main HTML file
├── package.json        # Dependencies and scripts
├── angular.json        # Angular project configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── Dockerfile          # Docker image configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## 📦 Modules

- **AppModule**: Core application module
- **AuthModule**: Authentication module for login/register features
- **AdminModule**: Admin dashboard and management features
- **OrdersModule**: Order processing and management
- **ProductsModule**: Product browsing and management
- **SharedModule**: Shared components, directives, and pipes
- **CartModule**: Shopping cart functionality

## 🛠️ Technology Stack

- **Angular 19**: Frontend framework
- **Angular Material**: UI component library
- **TailwindCSS 4**: Utility-first CSS framework
- **Chart.js**: Data visualization for admin dashboard
- **RxJS**: Reactive extensions for JavaScript
- **JWT Authentication**: Secure user authentication
- **FontAwesome**: Icon library
- **NgxToastr**: Toast notifications
- **Docker**: Containerization platform
- **Nginx**: Web server for Docker deployment

## 💳 Stripe Payment Integration

### Prerequisites
- Node.js v20+ installed
- Stripe account
- Backend repository cloned and running

### Integration Steps

1. **Install Stripe CLI (Windows)**
   ```bash
   # Download the Stripe CLI for Windows
   curl -O https://github.com/stripe/stripe-cli/releases/download/v1.26.1/stripe_1.26.1_windows_x86_64.zip
   # Extract the ZIP file
   # Add the extracted directory to your PATH Environment Variables
   # Open the extracted `stripe.exe` file in command prompt
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   # This will open your browser and ask you to authenticate. After success, your local CLI will be connected to your Stripe account.
   ```
3. **Add your Stripe Secret and publishable key**
- The Stripe CLI will output a secret and publishable key. Add this secret to your backend's `application.properties`:
     ```properties
     stripe.api.secretKey=<sk_test_your_key_here>
     stripe.api.publishableKey=<pk_test_your_key_here>
     ```
4. **Install Stripe NPM package**
   ```bash
   npm install @stripe/stripe-js --save
   ```

5. **Setup Stripe webhook for local testing**
   ```bash
   # start the webhook listener
   stripe listen --forward-to http://localhost:8080/api/webhook
   ```

6. **Add your  webhook secret key**
- The Stripe CLI will output a webhook secret. Add this secret to your backend's `application.properties`:
     ```properties
     stripe.webhook.secret=<whsec_your_webhook_secret_here>
     ```





7. **Implement Stripe in the checkout component**
   - Initialize Stripe in your payment component
   - Create payment intent through your backend API
   - Handle successful payments and redirect to confirmation page

## 🚀 Running the Application

### Option 1: Standard Setup

#### Prerequisites
- Node.js (v20 or later)
- npm (v10 or later)
- Angular CLI (v19)

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hrishabh-16/cliqshop-frontend.git
   cd cliqshop-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize Tailwind CSS (if not already initialized)**
   ```bash
   npm run tailwind:init
   ```

4. **Run the development server**
   ```bash
   ng serve
   ```
   The application will be available at `http://localhost:4200`.

5. **Build for production**
   ```bash
   ng build
   ```

### Option 2: Docker Deployment

#### Prerequisites
- Docker 20.10+ and Docker Compose V2+
- Git

#### Running with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/hrishabh-16/cliqshop-frontend.git
   cd cliqshop-frontend
   ```

2. **Build the Docker image**
   ```bash
   docker build -t cliqshop-frontend:latest .
   ```

3. **Running the frontend with Docker Compose**
   
   For a complete application stack that includes the backend and database, please refer to the [CliQshop Backend repository](https://github.com/hrishabh-16/cliqshop-backend) for the Docker Compose configuration.

#### Docker Container Details

The Docker configuration includes:

1. **Build stage**:
   - Uses Node.js 20.18.3 as the base image
   - Installs all dependencies
   - Adjusts Angular budget configuration for larger builds
   - Builds the production Angular application

2. **Runtime stage**:
   - Uses Nginx Alpine as the base image
   - Configures Nginx to serve the Angular application
   - Sets up API proxying to the backend service
   - Listens on port 4200

### Configuration
- Update the API URL in your service files to match your backend server.
- Configure any required API settings in your service files.

## 📸 Screenshots

### Customer Interface
![Home Page](https://i.imgur.com/m8t9w1j.png)

### Admin Interface
![Admin Dashboard](https://i.imgur.com/4KEAXw7.png)

## **Contact**
For questions or support, reach out via [hrishabhgautam480@gmail.com] or raise an issue on the repository.
