/**
 * Freshworks CRM Service
 * Comprehensive CRM integration for ToyFlix customer lifecycle management
 * Handles contact creation, updates, tagging, and custom field management
 */

import { freshworksConfig, ageGroupMapping, productTagMapping } from '@/config/freshworks';

// Type definitions
export interface FreshworksContact {
  id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  mobile_number: string;
  tags?: string[];
  custom_field?: {
    cf_kids_age_group?: string;
    cf_subscription_end_date?: string;
    [key: string]: any;
  };
}

export interface ContactSearchResult {
  id: number;
  first_name: string;
  last_name?: string;
  email?: string;
  mobile_number: string;
  tags?: string[];
  custom_field?: any;
}

export interface ContactCreateRequest {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  ageGroup?: string;
  subscriptionPlan?: string;
  subscriptionEndDate?: string;
  additionalTags?: string[];
}

export interface ContactUpdateRequest {
  contactId: number;
  subscriptionPlan?: string;
  ageGroup?: string;
  subscriptionEndDate?: string;
  additionalTags?: string[];
  customFields?: Record<string, any>;
}

export interface FreshworksAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  contactId?: number;
}

export class FreshworksCRMService {
  private static readonly baseHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Token token=${freshworksConfig.crm.apiKey}`,
  };

  /**
   * Create HTTP request with timeout and error handling
   */
  private static async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), freshworksConfig.timeouts.defaultTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.baseHeaders, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Search for contact by email
   */
  static async searchContactByEmail(email: string): Promise<ContactSearchResult | null> {
    try {
      console.log('🔍 Searching Freshworks contact by email:', email);
      
      const searchUrl = `${freshworksConfig.crm.baseUrl}/search?q=${encodeURIComponent(email)}&include=contact`;
      const response = await this.makeRequest(searchUrl);

      if (!response.ok) {
        console.error('❌ Freshworks search failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const contact = data[0];
        console.log('✅ Found Freshworks contact:', contact.id);
        return contact;
      }

      console.log('📝 No existing contact found for email:', email);
      return null;
    } catch (error: any) {
      console.error('❌ Error searching Freshworks contact:', error.message);
      return null;
    }
  }

  /**
   * Search for contact by phone number
   */
  static async searchContactByPhone(phoneNumber: string): Promise<ContactSearchResult | null> {
    try {
      console.log('🔍 Searching Freshworks contact by phone:', phoneNumber);
      
      const searchUrl = `${freshworksConfig.crm.baseUrl}/search?q=${encodeURIComponent(phoneNumber)}&include=contact`;
      const response = await this.makeRequest(searchUrl);

      if (!response.ok) {
        console.error('❌ Freshworks phone search failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const contact = data[0];
        console.log('✅ Found Freshworks contact by phone:', contact.id);
        return contact;
      }

      console.log('📝 No existing contact found for phone:', phoneNumber);
      return null;
    } catch (error: any) {
      console.error('❌ Error searching Freshworks contact by phone:', error.message);
      return null;
    }
  }

  /**
   * Create new contact in Freshworks CRM
   */
  static async createContact(request: ContactCreateRequest): Promise<FreshworksAPIResponse> {
    try {
      console.log('➕ Creating new Freshworks contact:', request.firstName, request.phoneNumber);

      // Prepare contact data
      const contactData: FreshworksContact = {
        first_name: request.firstName,
        last_name: request.lastName || '',
        email: request.email || '',
        mobile_number: request.phoneNumber,
        tags: ['leads'], // Default tag for new registrations
      };

      // Add custom fields if provided
      if (request.ageGroup || request.subscriptionEndDate) {
        contactData.custom_field = {};
        
        if (request.ageGroup) {
          const ageGroupText = ageGroupMapping[request.ageGroup] || request.ageGroup;
          contactData.custom_field.cf_kids_age_group = ageGroupText;
        }
        
        if (request.subscriptionEndDate) {
          contactData.custom_field.cf_subscription_end_date = request.subscriptionEndDate;
        }
      }

      // Add product-specific tags
      if (request.subscriptionPlan) {
        const productTag = productTagMapping[request.subscriptionPlan];
        if (productTag) {
          contactData.tags = [productTag];
        }
      }

      // Add additional tags
      if (request.additionalTags && request.additionalTags.length > 0) {
        contactData.tags = [...(contactData.tags || []), ...request.additionalTags];
      }

      const createUrl = `${freshworksConfig.crm.baseUrl}/contacts`;
      const response = await this.makeRequest(createUrl, {
        method: 'POST',
        body: JSON.stringify({ contact: contactData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to create Freshworks contact:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      console.log('✅ Freshworks contact created successfully:', result.contact?.id);

      return {
        success: true,
        data: result.contact,
        contactId: result.contact?.id,
      };
    } catch (error: any) {
      console.error('❌ Error creating Freshworks contact:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update existing contact in Freshworks CRM
   */
  static async updateContact(request: ContactUpdateRequest): Promise<FreshworksAPIResponse> {
    try {
      console.log('🔄 Updating Freshworks contact:', request.contactId);

      // Get existing contact tags first
      const existingTags = await this.getContactTags(request.contactId);
      
      // Prepare update data
      const updateData: Partial<FreshworksContact> = {};

      // Update custom fields
      if (request.ageGroup || request.subscriptionEndDate || request.customFields) {
        updateData.custom_field = {};
        
        if (request.ageGroup) {
          const ageGroupText = ageGroupMapping[request.ageGroup] || request.ageGroup;
          updateData.custom_field.cf_kids_age_group = ageGroupText;
        }
        
        if (request.subscriptionEndDate) {
          updateData.custom_field.cf_subscription_end_date = request.subscriptionEndDate;
        }

        if (request.customFields) {
          updateData.custom_field = { ...updateData.custom_field, ...request.customFields };
        }
      }

      // Update tags - replace lead tag with subscription-specific tag
      if (request.subscriptionPlan) {
        const productTag = productTagMapping[request.subscriptionPlan];
        if (productTag) {
          // Remove 'leads' tag and add product-specific tag
          const updatedTags = existingTags.filter(tag => tag !== 'leads');
          updatedTags.push(productTag);
          updateData.tags = updatedTags;
        }
      }

      // Add additional tags if provided
      if (request.additionalTags && request.additionalTags.length > 0) {
        const currentTags = updateData.tags || existingTags;
        updateData.tags = [...currentTags, ...request.additionalTags];
      }

      const updateUrl = `${freshworksConfig.crm.baseUrl}/contacts/${request.contactId}`;
      const response = await this.makeRequest(updateUrl, {
        method: 'PUT',
        body: JSON.stringify({ contact: updateData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to update Freshworks contact:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      console.log('✅ Freshworks contact updated successfully:', request.contactId);

      return {
        success: true,
        data: result.contact,
        contactId: request.contactId,
      };
    } catch (error: any) {
      console.error('❌ Error updating Freshworks contact:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contact tags for a specific contact
   */
  static async getContactTags(contactId: number): Promise<string[]> {
    try {
      const contactUrl = `${freshworksConfig.crm.baseUrl}/contacts/${contactId}`;
      const response = await this.makeRequest(contactUrl);

      if (!response.ok) {
        console.error('❌ Failed to get contact tags:', response.status);
        return [];
      }

      const data = await response.json();
      return data.contact?.tags || [];
    } catch (error: any) {
      console.error('❌ Error getting contact tags:', error.message);
      return [];
    }
  }

  /**
   * Create or update contact (unified method)
   */
  static async createOrUpdateContact(request: ContactCreateRequest): Promise<FreshworksAPIResponse> {
    try {
      // First try to find existing contact by email or phone
      let existingContact: ContactSearchResult | null = null;

      if (request.email) {
        existingContact = await this.searchContactByEmail(request.email);
      }

      if (!existingContact && request.phoneNumber) {
        existingContact = await this.searchContactByPhone(request.phoneNumber);
      }

      if (existingContact) {
        // Update existing contact
        console.log('🔄 Contact exists, updating with new subscription data');
        return await this.updateContact({
          contactId: existingContact.id,
          subscriptionPlan: request.subscriptionPlan,
          ageGroup: request.ageGroup,
          subscriptionEndDate: request.subscriptionEndDate,
          additionalTags: request.additionalTags,
        });
      } else {
        // Create new contact
        console.log('➕ Creating new contact');
        return await this.createContact(request);
      }
    } catch (error: any) {
      console.error('❌ Error in createOrUpdateContact:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle user registration (called on new user signup)
   */
  static async handleUserRegistration(
    firstName: string,
    phoneNumber: string,
    email?: string
  ): Promise<FreshworksAPIResponse> {
    console.log('👤 Handling user registration for Freshworks CRM');
    
    return await this.createOrUpdateContact({
      firstName,
      phoneNumber,
      email,
      additionalTags: ['leads'], // Tag as lead initially
    });
  }

  /**
   * Handle order completion (called after successful payment)
   */
  static async handleOrderCompletion(
    phoneNumber: string,
    email: string,
    subscriptionPlan: string,
    ageGroup: string
  ): Promise<FreshworksAPIResponse> {
    console.log('💳 Handling order completion for Freshworks CRM');

    // Calculate subscription end date (1 year from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

    return await this.createOrUpdateContact({
      firstName: '', // Will be preserved if contact exists
      phoneNumber,
      email,
      subscriptionPlan,
      ageGroup,
      subscriptionEndDate: subscriptionEndDate.toISOString().split('T')[0], // YYYY-MM-DD format
    });
  }
} 