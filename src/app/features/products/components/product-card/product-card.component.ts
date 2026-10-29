import { CartService } from '../../../cart/cart.service';
import { ButtonModule } from 'primeng/button';
import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBoxOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Product } from '../../data-access/product.model';

@Component({
  selector: 'app-product-card',
  imports: [ButtonModule, CardModule, TagModule, FontAwesomeModule, DecimalPipe],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  readonly cart = inject(CartService);
  readonly addIcon = faPlus;
  readonly product = input.required<Product>();
  readonly placeholderIcon = faBoxOpen;
  private readonly failedImage = signal<string | null>(null);
  readonly hasImage = computed(
    () => !!this.product().image && this.failedImage() !== this.product().image,
  );

  onImageError(): void {
    this.failedImage.set(this.product().image);
  }
}
