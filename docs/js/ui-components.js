// Fountain Protocol UI Components
// Handles UI animations, notifications, and component interactions

class FountainUIComponents {
    constructor() {
        this.notifications = [];
        this.animationDuration = 300;
    }

    // Show notification toast
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: this.getNotificationColor(type),
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: '1000',
            minWidth: '300px',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        });

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto remove
        const removeNotification = () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', removeNotification);

        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }

        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // Animate card entrance
    animateCardEntrance(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = `all ${this.animationDuration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    // Animate number changes
    animateNumber(element, startValue, endValue, duration = 1000) {
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (endValue - startValue) * easeOutCubic;
            
            element.textContent = Math.round(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    // Progress bar animation
    animateProgressBar(element, targetWidth, duration = 1000) {
        const startWidth = parseInt(element.style.width) || 0;
        const startTime = performance.now();
        
        const updateProgress = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentWidth = startWidth + (targetWidth - startWidth) * easeOutCubic;
            
            element.style.width = `${currentWidth}%`;
            
            if (progress < 1) {
                requestAnimationFrame(updateProgress);
            }
        };
        
        requestAnimationFrame(updateProgress);
    }

    // Loading state management
    setButtonLoading(button, loading = true) {
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.innerHTML = `
                <span class="button-spinner"></span>
                Loading...
            `;
            button.disabled = true;
            button.style.opacity = '0.7';
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
            button.style.opacity = '1';
        }
    }

    // Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
            
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.opacity = '0';
            
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, this.animationDuration);
        }
    }

    // Tooltip system
    createTooltip(element, text) {
        let tooltip = null;
        
        const showTooltip = (e) => {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            
            Object.assign(tooltip.style, {
                position: 'absolute',
                background: '#374151',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                zIndex: '1000',
                whiteSpace: 'nowrap',
                opacity: '0',
                transition: 'opacity 0.2s ease-in-out',
                pointerEvents: 'none'
            });
            
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
            
            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
            });
        };
        
        const hideTooltip = () => {
            if (tooltip) {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                }, 200);
            }
        };
        
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    }

    // Copy to clipboard with feedback
    copyToClipboard(text, feedbackElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = feedbackElement.textContent;
            feedbackElement.textContent = 'Copied!';
            feedbackElement.style.color = '#10b981';
            
            setTimeout(() => {
                feedbackElement.textContent = originalText;
                feedbackElement.style.color = '';
            }, 2000);
        }).catch(() => {
            this.showNotification('Failed to copy to clipboard', 'error');
        });
    }

    // Format currency values
    formatCurrency(amount, currency = 'HBAR', decimals = 2) {
        if (currency === 'HBAR') {
            return `${(amount / 100000000).toFixed(decimals)} ℏ`;
        }
        return `${amount.toLocaleString()} ${currency}`;
    }

    // Create skeleton loader
    createSkeleton(element) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        skeleton.style.cssText = `
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
            height: 20px;
            width: 100%;
        `;
        
        // Add keyframes if not exists
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .skeleton { display: block; }
                .skeleton-hide { display: none; }
            `;
            document.head.appendChild(style);
        }
        
        return skeleton;
    }

    // Show/hide skeleton loading
    showSkeleton(element) {
        const skeleton = this.createSkeleton(element);
        element.appendChild(skeleton);
        return skeleton;
    }

    hideSkeleton(skeleton) {
        if (skeleton && skeleton.parentNode) {
            skeleton.parentNode.removeChild(skeleton);
        }
    }

    // Status indicator
    setStatusIndicator(element, status) {
        const colors = {
            active: '#10b981',
            inactive: '#9ca3af',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        element.style.background = colors[status] || colors.inactive;
        
        // Add pulse animation for active status
        if (status === 'active') {
            element.style.animation = 'pulse 2s infinite';
            if (!document.getElementById('pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            element.style.animation = '';
        }
    }

    // Smooth scroll to element
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Debounce function for input handlers
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize all UI components
    initialize() {
        console.log('🎨 Initializing UI Components...');
        
        // Add CSS for button spinners
        this.injectButtonSpinnerStyles();
        
        // Initialize tooltips for elements with data-tooltip
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            this.createTooltip(element, element.dataset.tooltip);
        });
        
        // Add click to copy for elements with data-copy
        document.querySelectorAll('[data-copy]').forEach(element => {
            element.addEventListener('click', () => {
                this.copyToClipboard(element.dataset.copy, element);
            });
            element.style.cursor = 'pointer';
        });
        
        console.log('✅ UI Components initialized');
    }

    injectButtonSpinnerStyles() {
        if (!document.getElementById('button-spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'button-spinner-styles';
            style.textContent = `
                .button-spinner {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Create global instance
window.uiComponents = new FountainUIComponents();