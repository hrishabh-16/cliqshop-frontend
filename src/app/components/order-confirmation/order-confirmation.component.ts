import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order/order.service';
import { Order } from '../../models/order.model';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-order-confirmation',
  standalone: false,
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.css']
})
export class OrderConfirmationComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  isLoading = true;
  private subscriptions: Subscription[] = [];

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Get order ID from route params or query params
    this.route.paramMap.subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.loadOrder(Number(orderId));
      } else {
        this.route.queryParamMap.subscribe(queryParams => {
          const queryOrderId = queryParams.get('orderId');
          if (queryOrderId) {
            this.loadOrder(Number(queryOrderId));
          } else {
            this.isLoading = false;
            this.toastr.error('Order ID is missing');
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadOrder(orderId: number): void {
    this.isLoading = true;
    
    const sub = this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
        console.log('Loaded order:', order);
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.toastr.error('Failed to load order details');
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  printOrder(): void {
    window.print();
  }
}