// cliqshop-frontend\src\app\components\admin\users\users.component.ts
import { Component, OnInit, ChangeDetectorRef, NgZone, ApplicationRef, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { UserService } from '../../../services/user/user.service';
import { User } from '../../../models/user.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  @ViewChild('editModalElement') editModalElement!: ElementRef;
  @ViewChild('deleteModalElement') deleteModalElement!: ElementRef;

  allUsers: User[] = [];
  adminUsers: User[] = [];
  regularUsers: User[] = [];
  filteredUsers: User[] = [];
  
  selectedUser: User | null = null;
  currentView: 'all' | 'admins' | 'customers' = 'all';
  
  loading = true;
  error: string | null = null;
  successMessage: string = '';
  errorMessage: string = '';
  
  showEditModal = false;
  showDeleteModal = false;
  submitting = false;
  
  userForm: FormGroup;
  searchTerm = '';
  
  // Store the modal DOM references
  private editModalDOM: HTMLElement | null = null;
  private deleteModalDOM: HTMLElement | null = null;
  
  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private renderer: Renderer2,
    private el: ElementRef
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      role: ['USER', [Validators.required]],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    
    // Add global modal styles to document
    this.addModalStyles();
    
    // After the view is initialized, we need to get the modal DOM elements
    setTimeout(() => {
      this.initModalElements();
    }, 500);
  }
  
  ngAfterViewInit(): void {
    // Get the modal elements from the DOM after view is initialized
    this.initModalElements();
  }
  
  /**
   * Initialize modal DOM elements
   */
  private initModalElements(): void {
    try {
      // Find modal elements
      this.editModalDOM = document.getElementById('edit-modal');
      this.deleteModalDOM = document.getElementById('delete-modal');
      
      // Log the found elements
      console.log('Edit modal element:', this.editModalDOM);
      console.log('Delete modal element:', this.deleteModalDOM);
    } catch (err) {
      console.error('Error initializing modal elements:', err);
    }
  }
  
  /**
   * Adds CSS styles directly to the document to ensure modals display properly
   */
  private addModalStyles(): void {
    // Create style element for modal fixes
    const style = this.renderer.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      /* Modal force display */
      .modal-force-display {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 2000 !important;
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
      }
      
      /* Modal backdrop */
      .modal-backdrop-force {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.5) !important;
        z-index: 1999 !important;
      }
      
      /* Modal content */
      .modal-content-force {
        position: relative !important;
        background-color: white !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        pointer-events: auto !important;
        z-index: 2001 !important;
        max-width: 500px !important;
        margin: 2rem auto !important;
      }
      
      /* Force higher z-index for all modal related elements */
      #edit-modal, #delete-modal {
        z-index: 2000 !important;
      }
      
      /* Make modal dialog centered */
      .fixed.inset-0 {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
      }
      
      /* Toast notifications */
      .toast-notification {
        z-index: 2100 !important;
      }
    `;
    
    // Add style element to document head
    this.renderer.appendChild(document.head, style);
    console.log('Modal styles added to document head');
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.adminUsers = users.filter(user => user.role === 'ADMIN');
        this.regularUsers = users.filter(user => user.role === 'USER');
        this.applyFilter(this.currentView);
        this.loading = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      },
      error: (err) => {
        this.error = 'Failed to load users. Please try again later.';
        console.error('Error loading users:', err);
        this.loading = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      }
    });
  }
  
  applyFilter(filterType: 'all' | 'admins' | 'customers'): void {
    this.currentView = filterType;
    
    switch (filterType) {
      case 'all':
        this.filteredUsers = [...this.allUsers];
        break;
      case 'admins':
        this.filteredUsers = [...this.adminUsers];
        break;
      case 'customers':
        this.filteredUsers = [...this.regularUsers];
        break;
    }
    
    // Apply search filter if there is a search term
    if (this.searchTerm) {
      this.filteredUsers = this.filteredUsers.filter(user => 
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }
  
  searchUsers(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.searchTerm = element.value;
    this.applyFilter(this.currentView);
  }
  
  navigateBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
  
  refreshUsers(): void {
    this.loadUsers();
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }
  
  // Edit user - Completely replaced with direct DOM manipulation
  editUser(user: User): void {
    console.log('Edit user clicked:', user);
    
    // Re-initialize modal elements if they're not found
    if (!this.editModalDOM) {
      this.initModalElements();
    }
    
    this.selectedUser = { ...user }; // Create a copy to avoid direct reference modification
    
    // Patch the form values
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      enabled: user.enabled
    });
    
    // Set modal state
    this.showEditModal = true;
    console.log('Edit modal state:', this.showEditModal);
    
    // Force display immediately for quick response
    this.displayModalImmediately('edit-modal');
    
    // Then use our reliable method with a small delay
    setTimeout(() => {
      this.forceModalVisibility('edit-modal');
    }, 50);
  }
  
  // Update user
  updateUser(): void {
    if (this.userForm.invalid || !this.selectedUser) {
      this.markFormGroupTouched(this.userForm);
      return;
    }
    
    this.submitting = true;
    const userData = this.userForm.value;
    
    this.userService.updateUser(this.selectedUser.userId, userData).subscribe({
      next: (updatedUser) => {
        // Update the user in the lists
        this.updateUserInLists(updatedUser);
        
        this.successMessage = `User ${updatedUser.name} has been updated successfully`;
        setTimeout(() => {
          this.ngZone.run(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
            this.appRef.tick();
          });
        }, 5000);
        
        this.closeModal();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to update user. Please try again.';
        setTimeout(() => {
          this.ngZone.run(() => {
            this.errorMessage = '';
            this.cdr.detectChanges();
            this.appRef.tick();
          });
        }, 5000);
        console.error('Error updating user:', err);
        this.submitting = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      }
    });
  }
  
  // Delete user confirmation - Completely replaced with direct DOM manipulation
  confirmDelete(user: User): void {
    console.log('Confirm delete clicked:', user);
    
    // Re-initialize modal elements if they're not found
    if (!this.deleteModalDOM) {
      this.initModalElements();
    }
    
    this.selectedUser = { ...user }; // Create a copy
    
    // Set modal state
    this.showDeleteModal = true;
    console.log('Delete modal state:', this.showDeleteModal);
    
    // Force display immediately for quick response
    this.displayModalImmediately('delete-modal');
    
    // Then use our reliable method with a small delay
    setTimeout(() => {
      this.forceModalVisibility('delete-modal');
    }, 50);
  }
  
  // Directly manipulate the DOM to display modal immediately
  private displayModalImmediately(modalId: string): void {
    try {
      const modal = document.getElementById(modalId);
      if (modal) {
        // Apply inline styles directly
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '2000';
        console.log(`Modal ${modalId} immediate display applied`);
      }
    } catch (err) {
      console.error('Error in displayModalImmediately:', err);
    }
  }
  
  // Force a modal to be visible using DOM manipulation
  private forceModalVisibility(modalId: string): void {
    try {
      const modal = document.getElementById(modalId);
      if (modal) {
        // Apply the force display classes
        modal.classList.add('modal-force-display');
        
        // Create a backdrop element if it doesn't exist
        let backdrop = document.querySelector('.modal-backdrop-force') as HTMLElement;
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop-force';
          document.body.appendChild(backdrop);
          
          // Add click event to close on backdrop click
          backdrop.addEventListener('click', () => {
            if (modalId === 'edit-modal') {
              this.closeModal();
            } else if (modalId === 'delete-modal') {
              this.closeDeleteModal();
            }
          });
        }
        
        // Make sure modal content has the force class
        const modalContent = modal.querySelector('.modal-content') as HTMLElement;
        if (modalContent) {
          modalContent.classList.add('modal-content-force');
        }
        
        // Apply additional styles to modal
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.display = 'block !important';
        modal.style.zIndex = '2000';
        
        // Apply styles to make modal content centered
        if (modalContent) {
          modalContent.style.margin = '0 auto';
          modalContent.style.position = 'relative';
          modalContent.style.top = '10%';
          modalContent.style.maxWidth = '500px';
        }
        
        // Disable body scrolling
        document.body.style.overflow = 'hidden';
        
        console.log(`Modal ${modalId} force displayed`);
      } else {
        console.error(`Modal element with ID ${modalId} not found in the DOM`);
      }
    } catch (err) {
      console.error('Error forcing modal visibility:', err);
    }
  }
  
  // Delete user
  deleteUser(): void {
    if (!this.selectedUser) return;
    
    this.submitting = true;
    
    this.userService.deleteUser(this.selectedUser.userId).subscribe({
      next: () => {
        // Store the name before removing
        const userName = this.selectedUser?.name;
        
        // Remove the user from the lists
        this.removeUserFromLists(this.selectedUser!.userId);
        
        this.successMessage = `User ${userName} has been deleted successfully`;
        setTimeout(() => {
          this.ngZone.run(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
            this.appRef.tick();
          });
        }, 5000);
        
        this.closeDeleteModal();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to delete user. Please try again.';
        setTimeout(() => {
          this.ngZone.run(() => {
            this.errorMessage = '';
            this.cdr.detectChanges();
            this.appRef.tick();
          });
        }, 5000);
        console.error('Error deleting user:', err);
        this.submitting = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      }
    });
  }
  
  // Toggle user status
  toggleUserStatus(user: User): void {
    console.log('Toggle status clicked for user:', user);
    
    // Optimistic update - update UI first
    const previousStatus = user.enabled;
    user.enabled = !user.enabled;
    this.updateUserStatusInLists(user.userId, user.enabled);
    
    this.userService.toggleUserStatus(user.userId).subscribe({
      next: () => {
        console.log('Toggle status successful');
        this.ngZone.run(() => {
          this.successMessage = `User status has been ${user.enabled ? 'activated' : 'deactivated'} successfully`;
          setTimeout(() => {
            this.ngZone.run(() => {
              this.successMessage = '';
              this.cdr.detectChanges();
              this.appRef.tick();
            });
          }, 5000);
        });
      },
      error: (err) => {
        // Check if this is a "success error" (HTTP 200 but parser failed)
        if (err.status === 200 || (err.message && err.message.includes('parsing'))) {
          console.log('Toggle status successful despite parse error');
          this.ngZone.run(() => {
            this.successMessage = `User status has been ${user.enabled ? 'activated' : 'deactivated'} successfully`;
            setTimeout(() => {
              this.ngZone.run(() => {
                this.successMessage = '';
                this.cdr.detectChanges();
                this.appRef.tick();
              });
            }, 5000);
          });
          return;
        }
        
        console.error('Error toggling status:', err);
        // Revert the optimistic update
        this.ngZone.run(() => {
          user.enabled = previousStatus;
          this.updateUserStatusInLists(user.userId, previousStatus);
          
          this.errorMessage = 'Failed to update user status. Please try again.';
          setTimeout(() => {
            this.ngZone.run(() => {
              this.errorMessage = '';
              this.cdr.detectChanges();
              this.appRef.tick();
            });
          }, 5000);
        });
      }
    });
  }
  
  // Update user status in all lists
  private updateUserStatusInLists(userId: number, enabled: boolean): void {
    // Update in allUsers
    const allUsersIndex = this.allUsers.findIndex(u => u.userId === userId);
    if (allUsersIndex !== -1) {
      this.allUsers[allUsersIndex].enabled = enabled;
    }
    
    // Update in adminUsers
    const adminUsersIndex = this.adminUsers.findIndex(u => u.userId === userId);
    if (adminUsersIndex !== -1) {
      this.adminUsers[adminUsersIndex].enabled = enabled;
    }
    
    // Update in regularUsers
    const regularUsersIndex = this.regularUsers.findIndex(u => u.userId === userId);
    if (regularUsersIndex !== -1) {
      this.regularUsers[regularUsersIndex].enabled = enabled;
    }
    
    // Update in filteredUsers
    const filteredUsersIndex = this.filteredUsers.findIndex(u => u.userId === userId);
    if (filteredUsersIndex !== -1) {
      this.filteredUsers[filteredUsersIndex].enabled = enabled;
    }
    
    // Force change detection
    this.cdr.detectChanges();
    this.appRef.tick();
  }
  
  // Close edit modal - Completely replaced with direct DOM manipulation
  closeModal(): void {
    this.showEditModal = false;
    
    // Remove the force display classes and clean up
    this.clearModalDisplay('edit-modal');
    
    this.resetForm();
    this.cdr.detectChanges();
    this.appRef.tick();
  }
  
  // Close delete modal - Completely replaced with direct DOM manipulation
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    
    // Remove the force display classes and clean up
    this.clearModalDisplay('delete-modal');
    
    this.selectedUser = null;
    this.cdr.detectChanges();
    this.appRef.tick();
  }
  
  // Remove modal display classes and clean up
  private clearModalDisplay(modalId: string): void {
    try {
      const modal = document.getElementById(modalId);
      if (modal) {
        // Remove the force display classes
        modal.classList.remove('modal-force-display');
        
        // Reset inline styles
        modal.style.display = '';
        modal.style.visibility = '';
        modal.style.opacity = '';
        modal.style.zIndex = '';
        modal.style.position = '';
        modal.style.top = '';
        modal.style.left = '';
        modal.style.width = '';
        modal.style.height = '';
        
        // Remove the backdrop element if it exists
        const backdrop = document.querySelector('.modal-backdrop-force');
        if (backdrop) {
          backdrop.remove();
        }
        
        // Enable body scrolling
        document.body.style.overflow = '';
        
        console.log(`Modal ${modalId} force hidden`);
      }
    } catch (err) {
      console.error('Error clearing modal display:', err);
    }
  }
  
  // Reset form
  resetForm(): void {
    this.userForm.reset({
      role: 'USER',
      enabled: true
    });
    this.selectedUser = null;
  }
  
  // Helper to mark all form fields as touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if ((control as any).controls) { // check if it's a FormGroup
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
  
  // Helper to update a user in all lists
  private updateUserInLists(updatedUser: User): void {
    // Helper function to update user in a list
    const updateUserInList = (list: User[]): void => {
      const index = list.findIndex(u => u.userId === updatedUser.userId);
      if (index !== -1) {
        list[index] = { ...updatedUser };
      }
    };
    
    // Update in all lists
    updateUserInList(this.allUsers);
    
    // Check role for admin/regular lists
    if (updatedUser.role === 'ADMIN') {
      // Remove from regular users if present
      this.regularUsers = this.regularUsers.filter(u => u.userId !== updatedUser.userId);
      // Add to admin users if not present
      if (!this.adminUsers.some(u => u.userId === updatedUser.userId)) {
        this.adminUsers.push(updatedUser);
      } else {
        updateUserInList(this.adminUsers);
      }
    } else {
      // Remove from admin users if present
      this.adminUsers = this.adminUsers.filter(u => u.userId !== updatedUser.userId);
      // Add to regular users if not present
      if (!this.regularUsers.some(u => u.userId === updatedUser.userId)) {
        this.regularUsers.push(updatedUser);
      } else {
        updateUserInList(this.regularUsers);
      }
    }
    
    // Refresh the filtered list
    this.applyFilter(this.currentView);
  }
  
  // Helper to remove a user from all lists
  private removeUserFromLists(userId: number): void {
    this.allUsers = this.allUsers.filter(u => u.userId !== userId);
    this.adminUsers = this.adminUsers.filter(u => u.userId !== userId);
    this.regularUsers = this.regularUsers.filter(u => u.userId !== userId);
    this.applyFilter(this.currentView);
  }
}