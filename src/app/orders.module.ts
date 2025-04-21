// orders.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';

import { OrdersComponent } from './components/orders/orders.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    OrdersComponent,
    OrderConfirmationComponent,
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule
  ],
  exports: [
    OrdersComponent,
    OrderConfirmationComponent,
    ConfirmDialogComponent
  ]
})
export class OrdersModule { }