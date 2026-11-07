package tests

import (
	"encoding/json"
	"fmt"
	"github.com/gofiber/fiber/v3"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

type webClient struct {
	t       *testing.T
	app     *fiber.App
	cookies map[string]string
}

func newClient(t *testing.T, app *fiber.App, email string) *webClient {
	w := &webClient{t, app, map[string]string{}}
	w.do("GET", "/login", "")
	response := w.do("POST", "/login", fmt.Sprintf(`{"email":%q,"password":"password"}`, email))
	if response.StatusCode != 303 {
		t.Fatalf("login %s: %d", email, response.StatusCode)
	}
	return w
}
func (w *webClient) do(method, path, body string) *http.Response {
	pairs := []string{}
	for name, value := range w.cookies {
		pairs = append(pairs, name+"="+value)
	}
	csrf, _ := url.QueryUnescape(w.cookies["XSRF-TOKEN"])
	response := send(w.t, w.app, method, path, body, map[string]string{"Cookie": strings.Join(pairs, "; "), "X-XSRF-TOKEN": csrf, "X-Inertia": "true", "Referer": "http://example.com/distribute"})
	for _, cookie := range response.Cookies() {
		w.cookies[cookie.Name] = cookie.Value
	}
	w.t.Cleanup(func() { response.Body.Close() })
	return response
}
func (w *webClient) page(path string) map[string]any {
	r := w.do("GET", path, "")
	if r.StatusCode != 200 {
		w.t.Fatalf("GET %s: %d", path, r.StatusCode)
	}
	return decode(w.t, r)["props"].(map[string]any)
}
func (w *webClient) post(path, body string) {
	r := w.do("POST", path, body)
	if r.StatusCode != 303 {
		w.t.Fatalf("POST %s: %d", path, r.StatusCode)
	}
}
func TestCensusEnrollmentAndClaim(t *testing.T) {
	app := setup(t)
	admin := newClient(t, app, "admin@example.com")
	census := newClient(t, app, "enumerator@example.com")
	distribution := newClient(t, app, "distributor@example.com")
	for _, x := range []struct {
		client             *webClient
		method, path, body string
	}{{census, "GET", "/distribute", ""}, {distribution, "GET", "/households", ""}, {census, "POST", "/claims", `{}`}, {distribution, "POST", "/households", `{}`}, {census, "POST", "/programs", `{}`}, {distribution, "GET", "/team", ""}} {
		if r := x.client.do(x.method, x.path, x.body); r.StatusCode != 403 {
			t.Fatalf("role boundary %s: %d", x.path, r.StatusCode)
		}
	}
	census.post("/households", `{"head":"  ","address":"Road","purok":"Purok 1","latitude":999,"longitude":121}`)
	if rows := census.page("/households")["households"].([]any); len(rows) != 0 {
		t.Fatal("invalid census persisted")
	}
	census.post("/households", `{"head":"Maria Santos","address":"10 Mabini St","purok":"Purok 1","phone":"09123456789","latitude":14.6,"longitude":121.0,"members":[{"name":"Jose Santos","relationship":"Spouse","age":35}]}`)
	household := census.page("/households/1")["household"].(map[string]any)
	if household["head"] != "Maria Santos" || len(household["members"].([]any)) != 1 {
		t.Fatalf("census not persisted: %v", household)
	}
	for _, name := range []string{"Food packs", "Rice assistance"} {
		admin.post("/programs", fmt.Sprintf(`{"name":%q,"assistance":"5 kg rice","date":"2026-11-07","venue":"Covered court"}`, name))
	}
	mapStatus := func(program string) string {
		return census.page("/households?program_id=" + program)["households"].([]any)[0].(map[string]any)["claim_status"].(string)
	}
	if mapStatus("1") != "not_enrolled" {
		t.Fatal("map incorrectly marks unregistered household as pending")
	}
	census.post("/enrollments", `{"household_id":1,"program_id":1}`)
	if mapStatus("1") != "pending" {
		t.Fatal("enrolled household should be pending on map")
	}
	census.post("/enrollments", `{"household_id":1,"program_id":1}`)
	rows := census.page("/households/1")["enrollments"].([]any)
	if len(rows) != 1 {
		t.Fatal("duplicate enrollment")
	}
	token := rows[0].(map[string]any)["token"].(string)
	if len(token) != 64 {
		t.Fatal("invalid QR token")
	}
	r := distribution.do("GET", "/claim-lookup?program_id=2&token="+token, "")
	if r.StatusCode != 404 {
		t.Fatal("wrong program lookup allowed")
	}
	r = distribution.do("GET", "/claim-lookup?program_id=1&token="+token, "")
	if r.StatusCode != 200 {
		t.Fatal("lookup failed")
	}
	if decode(t, r)["claim"].(map[string]any)["id"].(float64) != 0 {
		t.Fatal("scan should not claim")
	}
	claimBody := fmt.Sprintf(`{"token":%q,"program_id":1,"claimant":"Maria Santos"}`, token)
	distribution.post("/claims", claimBody)
	distribution.post("/claims", claimBody)
	if mapStatus("1") != "claimed" || mapStatus("2") != "not_enrolled" {
		t.Fatal("map status must be specific to selected program")
	}
	if r := census.do("GET", "/households?program_id=999999", ""); r.StatusCode != 404 {
		t.Fatal("unknown map program accepted")
	}
	dashboard := admin.page("/dashboard")
	stats := dashboard["stats"].(map[string]any)
	if stats["claimed"].(float64) != 1 {
		t.Fatal("duplicate release not blocked")
	}
	recent := dashboard["recent"].([]any)[0].(map[string]any)
	if recent["claimant"] != "Maria Santos" || recent["officer"].(map[string]any)["role"] != "distributor" {
		t.Fatal("missing audit information")
	}
	census.post("/enrollments", `{"household_id":1,"program_id":2}`)
	rows = census.page("/households/1")["enrollments"].([]any)
	if len(rows) != 2 {
		t.Fatal("household should enroll separately per program")
	}
	token2 := rows[1].(map[string]any)["token"].(string)
	if token2 == token {
		t.Fatal("program QR must be unique")
	}
	admin.post("/programs/2/close", `{}`)
	distribution.post("/claims", fmt.Sprintf(`{"token":%q,"program_id":2,"claimant":"Maria Santos"}`, token2))
	stats = admin.page("/dashboard")["stats"].(map[string]any)
	if stats["claimed"].(float64) != 1 {
		t.Fatal("closed program accepted a release")
	}
	admin.post("/team", `{"name":"New Officer","email":"new@example.com","password":"secure-password-123","role":"enumerator"}`)
	users := admin.page("/team")["users"].([]any)
	if len(users) != 4 {
		t.Fatal("staff creation failed")
	}
	raw, _ := json.Marshal(users)
	if strings.Contains(string(raw), "secure-password") {
		t.Fatal("password leaked")
	}
	admin.post("/team", `{"name":"Bad role","email":"bad@example.com","password":"secure-password-123","role":"superuser"}`)
	if len(admin.page("/team")["users"].([]any)) != 4 {
		t.Fatal("invalid role accepted")
	}
	// Revoking access must preserve the release audit and end the old session's access.
	r = admin.do("DELETE", "/users/3", "")
	if r.StatusCode != 303 {
		t.Fatalf("revoke staff: %d", r.StatusCode)
	}
	recent = admin.page("/dashboard")["recent"].([]any)[0].(map[string]any)
	if recent["officer"].(map[string]any)["name"] != "Distribution Officer" {
		t.Fatal("revocation erased release attribution")
	}
	r = distribution.do("GET", "/claim-lookup?program_id=1&token="+token, "")
	if r.StatusCode != 303 || r.Header.Get("Location") != "/login" {
		t.Fatal("revoked staff still has access")
	}
}
