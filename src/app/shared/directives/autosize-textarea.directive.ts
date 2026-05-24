import { AfterViewInit, Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'textarea[appAutosize]',
  standalone: true,
})
export class AutosizeTextareaDirective implements AfterViewInit {
  @Input() minRows = 2;
  @Input() maxHeightPx = 320;

  constructor(private readonly el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    this.adjust();
    // Re-run when fonts load (font-display=swap shifts metrics).
    queueMicrotask(() => this.adjust());
  }

  @HostListener('input') onInput(): void {
    this.adjust();
  }

  private adjust(): void {
    const ta = this.el.nativeElement;
    ta.style.overflow = 'hidden';
    ta.style.height = 'auto';
    const desired = ta.scrollHeight;
    if (desired > this.maxHeightPx) {
      ta.style.height = `${this.maxHeightPx}px`;
      ta.style.overflowY = 'auto';
    } else {
      ta.style.height = `${desired}px`;
      ta.style.overflowY = 'hidden';
    }
  }
}
