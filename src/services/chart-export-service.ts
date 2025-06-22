'use client';

import { format } from 'date-fns';

// Chart Export Service for converting Recharts to images
class ChartExportService {
  private static loadHtml2Canvas(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        resolve((window as any).html2canvas);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = () => {
        resolve((window as any).html2canvas);
      };
      script.onerror = () => {
        reject(new Error('Failed to load html2canvas library'));
      };
      document.head.appendChild(script);
    });
  }

  private static downloadImage(canvas: HTMLCanvasElement, filename: string, format: 'png' | 'jpeg' = 'png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL(`image/${format}`);
    link.click();
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Export chart element to PNG
  static async exportChartToPNG(
    elementSelector: string | HTMLElement,
    options?: {
      filename?: string;
      width?: number;
      height?: number;
      backgroundColor?: string;
      scale?: number;
    }
  ): Promise<void> {
    try {
      const html2canvas = await this.loadHtml2Canvas();
      
      const element = typeof elementSelector === 'string' 
        ? document.querySelector(elementSelector) as HTMLElement
        : elementSelector;
      
      if (!element) {
        throw new Error('Chart element not found');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: options?.backgroundColor || '#ffffff',
        scale: options?.scale || 2,
        width: options?.width,
        height: options?.height,
        useCORS: true,
        allowTaint: true
      });

      const filename = options?.filename || `chart_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.png`;
      this.downloadImage(canvas, filename, 'png');
      
    } catch (error) {
      console.error('Error exporting chart to PNG:', error);
      throw error;
    }
  }

  // Export chart element to JPEG
  static async exportChartToJPEG(
    elementSelector: string | HTMLElement,
    options?: {
      filename?: string;
      width?: number;
      height?: number;
      backgroundColor?: string;
      scale?: number;
      quality?: number;
    }
  ): Promise<void> {
    try {
      const html2canvas = await this.loadHtml2Canvas();
      
      const element = typeof elementSelector === 'string' 
        ? document.querySelector(elementSelector) as HTMLElement
        : elementSelector;
      
      if (!element) {
        throw new Error('Chart element not found');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: options?.backgroundColor || '#ffffff',
        scale: options?.scale || 2,
        width: options?.width,
        height: options?.height,
        useCORS: true,
        allowTaint: true
      });

      const filename = options?.filename || `chart_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.jpg`;
      this.downloadImage(canvas, filename, 'jpeg');
      
    } catch (error) {
      console.error('Error exporting chart to JPEG:', error);
      throw error;
    }
  }

  // Export chart to SVG (for Recharts specifically)
  static exportChartToSVG(
    elementSelector: string | HTMLElement,
    options?: {
      filename?: string;
      title?: string;
    }
  ): void {
    try {
      const element = typeof elementSelector === 'string' 
        ? document.querySelector(elementSelector) as HTMLElement
        : elementSelector;
      
      if (!element) {
        throw new Error('Chart element not found');
      }

      // Look for SVG element within the chart container
      const svgElement = element.querySelector('svg');
      if (!svgElement) {
        throw new Error('SVG element not found in chart');
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Add title if provided
      if (options?.title) {
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleElement.textContent = options.title;
        clonedSvg.insertBefore(titleElement, clonedSvg.firstChild);
      }

      // Ensure proper SVG namespace and styling
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // Add CSS styles inline for better compatibility
      const styleSheet = Array.from(document.styleSheets).find(sheet => {
        try {
          return sheet.href === null || sheet.href.includes(window.location.origin);
        } catch {
          return false;
        }
      });

      if (styleSheet) {
        try {
          const rules = Array.from(styleSheet.cssRules);
          const relevantRules = rules.filter(rule => {
            return rule.cssText && (
              rule.cssText.includes('.recharts') ||
              rule.cssText.includes('svg') ||
              rule.cssText.includes('text') ||
              rule.cssText.includes('path')
            );
          });

          if (relevantRules.length > 0) {
            const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleElement.textContent = relevantRules.map(rule => rule.cssText).join('\n');
            clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
          }
        } catch (error) {
          console.warn('Could not extract CSS rules for SVG export:', error);
        }
      }

      // Create blob and download
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      const filename = options?.filename || `chart_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.svg`;
      this.downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('Error exporting chart to SVG:', error);
      throw error;
    }
  }

  // Export multiple charts as a ZIP file
  static async exportMultipleCharts(
    charts: Array<{
      element: string | HTMLElement;
      filename: string;
      format: 'png' | 'jpeg' | 'svg';
      options?: any;
    }>,
    zipFilename?: string
  ): Promise<void> {
    try {
      // Load JSZip dynamically
      const JSZip = await this.loadJSZip();
      const zip = new JSZip();

      for (const chart of charts) {
        try {
          let blob: Blob;

          if (chart.format === 'svg') {
            const element = typeof chart.element === 'string' 
              ? document.querySelector(chart.element) as HTMLElement
              : chart.element;
            
            const svgElement = element?.querySelector('svg');
            if (svgElement) {
              const svgData = new XMLSerializer().serializeToString(svgElement);
              blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            } else {
              continue; // Skip if SVG not found
            }
          } else {
            // For PNG/JPEG, we need to convert to blob
            const html2canvas = await this.loadHtml2Canvas();
            const element = typeof chart.element === 'string' 
              ? document.querySelector(chart.element) as HTMLElement
              : chart.element;
            
            if (!element) continue;

            const canvas = await html2canvas(element, {
              backgroundColor: chart.options?.backgroundColor || '#ffffff',
              scale: chart.options?.scale || 2,
              useCORS: true,
              allowTaint: true
            });

            blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((result) => {
                resolve(result!);
              }, `image/${chart.format}`);
            });
          }

          zip.file(chart.filename, blob);
        } catch (error) {
          console.warn(`Failed to export chart ${chart.filename}:`, error);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = zipFilename || `charts_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.zip`;
      this.downloadBlob(zipBlob, filename);

    } catch (error) {
      console.error('Error creating charts ZIP file:', error);
      throw error;
    }
  }

  private static loadJSZip(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).JSZip) {
        resolve((window as any).JSZip);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        resolve((window as any).JSZip);
      };
      script.onerror = () => {
        reject(new Error('Failed to load JSZip library'));
      };
      document.head.appendChild(script);
    });
  }

  // Export dashboard with all charts
  static async exportDashboardCharts(
    options?: {
      filename?: string;
      format?: 'png' | 'jpeg' | 'svg' | 'zip';
      chartSelectors?: string[];
      title?: string;
    }
  ): Promise<void> {
    const defaultSelectors = [
      '.balance-chart',
      '.spending-chart', 
      '.income-expense-chart',
      '.category-chart',
      '.trends-chart'
    ];

    const selectors = options?.chartSelectors || defaultSelectors;
    const format = options?.format || 'png';
    
    if (format === 'zip') {
      const charts = selectors.map((selector, index) => ({
        element: selector,
        filename: `dashboard_chart_${index + 1}.png`,
        format: 'png' as const,
        options: { backgroundColor: '#ffffff', scale: 2 }
      }));

      await this.exportMultipleCharts(charts, options?.filename || `dashboard_charts_${format(new Date(), 'yyyy-MM-dd')}.zip`);
    } else {
      // Export each chart individually
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        const element = document.querySelector(selector) as HTMLElement;
        
        if (element) {
          const filename = options?.filename 
            ? `${options.filename}_${i + 1}.${format}`
            : `dashboard_chart_${i + 1}_${format(new Date(), 'yyyy-MM-dd')}.${format}`;

          try {
            switch (format) {
              case 'png':
                await this.exportChartToPNG(element, { filename });
                break;
              case 'jpeg':
                await this.exportChartToJPEG(element, { filename });
                break;
              case 'svg':
                this.exportChartToSVG(element, { filename, title: options?.title });
                break;
            }
          } catch (error) {
            console.warn(`Failed to export chart ${selector}:`, error);
          }
        }
      }
    }
  }

  // Export chart with custom canvas drawing (for more control)
  static async exportCustomChart(
    drawFunction: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void,
    options?: {
      filename?: string;
      width?: number;
      height?: number;
      format?: 'png' | 'jpeg';
      backgroundColor?: string;
    }
  ): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = options?.width || 800;
    canvas.height = options?.height || 400;
    
    // Set background color
    if (options?.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Execute custom drawing function
    drawFunction(canvas, ctx);
    
    const filename = options?.filename || `custom_chart_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${options?.format || 'png'}`;
    this.downloadImage(canvas, filename, options?.format || 'png');
  }

  // Utility function to get chart element by various selectors
  static findChartElement(identifier: string | HTMLElement): HTMLElement | null {
    if (typeof identifier !== 'string') {
      return identifier;
    }

    // Try different selection methods
    let element = document.querySelector(identifier) as HTMLElement;
    
    if (!element) {
      // Try by ID
      element = document.getElementById(identifier);
    }
    
    if (!element) {
      // Try by data attribute
      element = document.querySelector(`[data-chart="${identifier}"]`) as HTMLElement;
    }
    
    if (!element) {
      // Try by class name
      element = document.querySelector(`.${identifier}`) as HTMLElement;
    }

    return element;
  }
}

export default ChartExportService;