package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/pkg/inertia"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AyudaController struct{ db *gorm.DB }

func NewAyudaController(db *gorm.DB) *AyudaController { return &AyudaController{db} }

func (a *AyudaController) Dashboard(c fiber.Ctx) error {
	var households, members, enrolled, claimed int64
	for _, item := range []struct {
		model any
		count *int64
	}{{&models.Household{}, &households}, {&models.Member{}, &members}, {&models.Enrollment{}, &enrolled}, {&models.Claim{}, &claimed}} {
		if err := a.db.Model(item.model).Count(item.count).Error; err != nil {
			return err
		}
	}
	var programs []models.Program
	if err := a.db.Order("date DESC").Find(&programs).Error; err != nil {
		return err
	}
	var recent []models.Claim
	if err := a.db.Preload("Enrollment.Household").Preload("Enrollment.Program").Preload("Officer", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Order("created_at DESC").Limit(8).Find(&recent).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Ayuda/Dashboard", fiber.Map{"stats": fiber.Map{"households": households, "residents": households + members, "enrolled": enrolled, "claimed": claimed}, "programs": programs, "recent": recent})
}
func (a *AyudaController) Households(c fiber.Ctx) error {
	var programs []models.Program
	if err := a.db.Order("date DESC, id DESC").Find(&programs).Error; err != nil {
		return err
	}
	var programID uint
	if value := c.Query("program_id"); value != "" {
		id, err := strconv.ParseUint(value, 10, 32)
		if err != nil || id == 0 {
			return fiber.ErrBadRequest
		}
		found := false
		for _, p := range programs {
			if p.ID == uint(id) {
				found = true
				break
			}
		}
		if !found {
			return fiber.ErrNotFound
		}
		programID = uint(id)
	} else if len(programs) > 0 {
		programID = programs[0].ID
	}
	var rows []models.Household
	q := a.db.Preload("Members").Order("created_at DESC")
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		q = q.Where("head LIKE ? OR purok LIKE ? OR address LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if err := q.Find(&rows).Error; err != nil {
		return err
	}
	// Read only enrollment/claim IDs: map viewers never need the QR token.
	var releases []struct {
		HouseholdID uint
		ClaimID     uint
	}
	if programID != 0 {
		if err := a.db.Table("enrollments").Select("enrollments.household_id, COALESCE(claims.id, 0) AS claim_id").Joins("LEFT JOIN claims ON claims.enrollment_id = enrollments.id").Where("enrollments.program_id = ?", programID).Scan(&releases).Error; err != nil {
			return err
		}
	}
	statuses := make(map[uint]string)
	for _, r := range releases {
		statuses[r.HouseholdID] = "pending"
		if r.ClaimID != 0 {
			statuses[r.HouseholdID] = "claimed"
		}
	}
	type mappedHousehold struct {
		models.Household
		ClaimStatus string `json:"claim_status"`
	}
	mapped := make([]mappedHousehold, 0, len(rows))
	for _, h := range rows {
		status := "not_enrolled"
		if programID == 0 {
			status = "no_program"
		} else if s, ok := statuses[h.ID]; ok {
			status = s
		}
		mapped = append(mapped, mappedHousehold{h, status})
	}
	return inertia.Render(c, "Ayuda/Households", fiber.Map{"households": mapped, "search": c.Query("search"), "programs": programs, "program_id": programID})
}
func (a *AyudaController) CreateHousehold(c fiber.Ctx) error {
	return inertia.Render(c, "Ayuda/Census", nil)
}
func (a *AyudaController) StoreHousehold(c fiber.Ctx) error {
	var r requests.CensusRequest
	if ok, err := bind(c, &r); !ok {
		return err
	}
	h := models.Household{Head: r.Head, Address: r.Address, Purok: r.Purok, Phone: r.Phone, Latitude: *r.Latitude, Longitude: *r.Longitude, RecordedBy: auth.User(c).ID}
	for _, m := range r.Members {
		h.Members = append(h.Members, models.Member{Name: m.Name, Relationship: m.Relationship, Age: m.Age})
	}
	if err := a.db.Create(&h).Error; err != nil {
		return err
	}
	return redirect(c, "/households/"+strconv.Itoa(int(h.ID)), "success", "Na-save ang household census.")
}
func (a *AyudaController) Household(c fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	var h models.Household
	if err := a.db.Preload("Members").First(&h, id).Error; err != nil {
		return recordError(err)
	}
	var programs []models.Program
	var enrollments []models.Enrollment
	if err := a.db.Where("status = ?", "open").Order("date DESC").Find(&programs).Error; err != nil {
		return err
	}
	if err := a.db.Preload("Program").Where("household_id = ?", id).Find(&enrollments).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Ayuda/Household", fiber.Map{"household": h, "programs": programs, "enrollments": enrollments})
}
func (a *AyudaController) Programs(c fiber.Ctx) error {
	var programs []models.Program
	if err := a.db.Order("date DESC").Find(&programs).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Ayuda/Programs", fiber.Map{"programs": programs})
}
func (a *AyudaController) StoreProgram(c fiber.Ctx) error {
	var r requests.ProgramRequest
	if ok, err := bind(c, &r); !ok {
		return err
	}
	p := models.Program{Name: r.Name, Assistance: r.Assistance, Venue: r.Venue, Date: r.Date, Status: "open"}
	if err := a.db.Create(&p).Error; err != nil {
		return err
	}
	return redirect(c, "/programs", "success", "Nagawa na ang ayuda program.")
}
func (a *AyudaController) CloseProgram(c fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	result := a.db.Model(&models.Program{}).Where("id = ?", id).Update("status", "closed")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fiber.ErrNotFound
	}
	return back(c, "success", "Sarado na ang program. Hindi na puwedeng mag-enroll o mag-claim.")
}
func (a *AyudaController) Enroll(c fiber.Ctx) error {
	var r requests.EnrollmentRequest
	if ok, err := bind(c, &r); !ok {
		return err
	}
	var h models.Household
	var p models.Program
	if err := a.db.First(&h, r.HouseholdID).Error; err != nil {
		return recordError(err)
	}
	if err := a.db.First(&p, r.ProgramID).Error; err != nil {
		return recordError(err)
	}
	if p.Status != "open" {
		return back(c, "error", "Sarado na ang program.")
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	e := models.Enrollment{HouseholdID: h.ID, ProgramID: p.ID, Token: hex.EncodeToString(b)}
	result := a.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&e)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return back(c, "error", "Naka-enroll na ang household sa program na ito.")
	}
	return back(c, "success", "Enrolled na. Maaari nang i-print ang QR stub.")
}
func (a *AyudaController) Distribute(c fiber.Ctx) error {
	var programs []models.Program
	if err := a.db.Where("status = ?", "open").Order("date DESC").Find(&programs).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Ayuda/Distribute", fiber.Map{"programs": programs})
}
func (a *AyudaController) Lookup(c fiber.Ctx) error {
	var e models.Enrollment
	if len(c.Query("token")) != 64 {
		return c.Status(422).JSON(fiber.Map{"message": "Hindi valid ang QR o stub code."})
	}
	err := a.db.Preload("Household.Members").Preload("Program").Where("token = ? AND program_id = ?", c.Query("token"), c.Query("program_id")).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(404).JSON(fiber.Map{"message": "Walang enrollment para sa QR na ito sa napiling program."})
	}
	if err != nil {
		return err
	}
	var claim models.Claim
	err = a.db.Preload("Officer", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("enrollment_id = ?", e.ID).First(&claim).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return c.JSON(fiber.Map{"enrollment": e, "claim": claim})
}
func (a *AyudaController) Claim(c fiber.Ctx) error {
	var r requests.ClaimRequest
	if ok, err := bind(c, &r); !ok {
		return err
	}
	err := a.db.Transaction(func(tx *gorm.DB) error {
		var p models.Program
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&p, r.ProgramID).Error; err != nil {
			return recordError(err)
		}
		if p.Status != "open" {
			return fiber.NewError(409, "Sarado na ang program.")
		}
		var e models.Enrollment
		if err := tx.Where("token = ? AND program_id = ?", r.Token, r.ProgramID).First(&e).Error; err != nil {
			return recordError(err)
		}
		claim := models.Claim{EnrollmentID: e.ID, ReleasedBy: auth.User(c).ID, Claimant: r.Claimant}
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&claim)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return fiber.NewError(409, "Na-claim na ang ayuda ng household na ito.")
		}
		return nil
	})
	var fe *fiber.Error
	if errors.As(err, &fe) && fe.Code == 409 {
		return back(c, "error", fe.Message)
	}
	if err != nil {
		return err
	}
	return back(c, "success", "Na-release na ang ayuda. Naitala ang claimant, oras, at releasing officer.")
}
func (a *AyudaController) Team(c fiber.Ctx) error {
	var users []models.User
	if err := a.db.Order("name").Find(&users).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Ayuda/Team", fiber.Map{"users": users})
}
func (a *AyudaController) StoreStaff(c fiber.Ctx) error {
	var r requests.StaffRequest
	if ok, err := bind(c, &r); !ok {
		return err
	}
	u := models.User{Name: r.Name, Email: r.Email, Role: r.Role}
	if err := u.HashPassword(r.Password); err != nil {
		return err
	}
	result := a.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&u)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return back(c, "error", "Ginagamit na ang email na ito.")
	}
	return back(c, "success", "Nagawa na ang staff account.")
}
func recordError(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fiber.ErrNotFound
	}
	return err
}
