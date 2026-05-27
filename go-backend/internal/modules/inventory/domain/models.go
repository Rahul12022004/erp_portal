package domain

import "time"

type InventoryItem struct {
	ID            string
	SchoolID      string
	Name          string
	ItemCode      string
	Category      string
	Subcategory   string
	UnitType      string
	StockCount    int
	MinStockLevel int
	Condition     string // new | good | fair | damaged
	Supplier      string
	PurchaseDate  string
	Description   string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
