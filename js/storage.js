// Storage utility with fallback mechanisms
const StorageUtil = {
    // Check if storage is available
    isStorageAvailable: function() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('Storage access is not available:', e);
            return false;
        }
    },

    // Safely get item from storage
    getItem: function(key) {
        if (this.isStorageAvailable()) {
            return localStorage.getItem(key);
        }
        return null;
    },

    // Safely set item in storage
    setItem: function(key, value) {
        if (this.isStorageAvailable()) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn('Failed to set storage item:', e);
                return false;
            }
        }
        return false;
    },

    // Safely remove item from storage
    removeItem: function(key) {
        if (this.isStorageAvailable()) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Failed to remove storage item:', e);
                return false;
            }
        }
        return false;
    },

    // Safely clear all storage
    clear: function() {
        if (this.isStorageAvailable()) {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.warn('Failed to clear storage:', e);
                return false;
            }
        }
        return false;
    },

    // Get all stored user data
    getUserData: function() {
        return {
            userId: this.getItem('userId'),
            userRole: this.getItem('userRole'),
            userName: this.getItem('userName')
        };
    },

    // Set all user data
    setUserData: function(userData) {
        const success = 
            this.setItem('userId', userData.userId) &&
            this.setItem('userRole', userData.userRole) &&
            this.setItem('userName', userData.userName);
        
        return success;
    },

    // Clear user data
    clearUserData: function() {
        this.removeItem('userId');
        this.removeItem('userRole');
        this.removeItem('userName');
    }
};

// Export the utility
window.StorageUtil = StorageUtil; 