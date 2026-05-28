package domain

import "time"

type InventoryItem struct {
	ID            string    `json:"_id"`
	SchoolID      string    `json:"schoolId"`
	Name          string    `json:"name"`
	ItemCode      string    `json:"itemCode"`
	Category      string    `json:"category"`
	Subcategory   string    `json:"subcategory"`
	UnitType      string    `json:"unitType"`
	StockCount    int       `json:"stockCount"`
	MinStockLevel int       `json:"minStockLevel"`
	Condition     string    `json:"condition"`
	Supplier      string    `json:"supplier"`
	PurchaseDate  string    `json:"purchaseDate"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
