package domain

import "go.mongodb.org/mongo-driver/bson/primitive"

type SocialMediaAccount struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	SchoolID    primitive.ObjectID `bson:"schoolId"      json:"schoolId"`
	Platform    string             `bson:"platform"      json:"platform"`
	AccountName string             `bson:"accountName"   json:"accountName"`
	ProfileURL  string             `bson:"profileUrl"    json:"profileUrl"`
	PhoneNumber string             `bson:"phoneNumber"   json:"phoneNumber"`
	Bio         string             `bson:"bio"           json:"bio"`
	IsActive    bool               `bson:"isActive"      json:"isActive"`
}
