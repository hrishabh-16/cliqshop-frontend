// src/app/shared/footer/footer.component.ts
import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category/category.service';

@Component({
  selector: 'app-footer',
  standalone:false,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  categories: any[] = [];
  darkMode = false;
  currentYear: number = new Date().getFullYear();

  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.loadCategories();
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
      document.documentElement.classList.add('dark');
    }
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe(
      (categories) => {
        // Limit to top 5 categories for the footer
        this.categories = categories.slice(0, 5);
      },
      (error) => {
        console.error('Error loading categories:', error);
      }
    );
  }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    
    if (this.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}