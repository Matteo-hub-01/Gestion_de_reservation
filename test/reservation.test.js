const { ValidationError, ServiceError } = require("../src/errors");
const { createReservation, cancelReservation, searchReservation } = require("../src/reservation");

const makeDeps = () => {
    return {
        db: {
            getReservations: jest.fn(),
            createReservation: jest.fn(),
            deleteReservation: jest.fn(),
            getReservationById: jest.fn()
        }
    }
};

describe("Reservation module", () => {

    describe("Create reservation", () => {

        test("Id is undefined", async () => {
            const deps = makeDeps();

            expect(createReservation({
                name: "Jean",
                startDate: new Date("2026-05-08"),
                endDate: new Date("2026-05-10")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Id is empty"
            });
        });

        test("Name is undefined", async () => {
            const deps = makeDeps();

            expect(createReservation({
                id: 1,
                startDate: new Date("2026-05-08"),
                endDate: new Date("2026-05-10")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Name is empty"
            });
        });

        test("Start date is undefined", async () => {
            const deps = makeDeps();

            expect(createReservation({
                id: 1,
                name: "Jean",
                endDate: new Date("2026-05-10")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Start date is empty"
            });
        });

        test("End date is undefined", async () => {
            const deps = makeDeps();

            expect(createReservation({
                id: 1,
                name: "Jean",
                startDate: new Date("2026-05-08")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "End date is empty"
            });
        });

        test("End date before start date", async () => {
            const deps = makeDeps();

            expect(createReservation({
                id: 1,
                name: "Jean",
                startDate: new Date("2026-05-10"),
                endDate: new Date("2026-05-08")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "End date must be after start date"
            });
        });

        test("Reservation overlap", async () => {
            const deps = makeDeps();

            deps.db.getReservations.mockResolvedValue([
                { id: 1, startDate: new Date("2026-05-08"), endDate: new Date("2026-05-10") }
            ]);

            expect(createReservation({
                id: 2,
                name: "Paul",
                startDate: new Date("2026-05-09"),
                endDate: new Date("2026-05-11")
            }, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Reservation overlap"
            });
        });

        test("Valid reservation", async () => {
            const deps = makeDeps();

            deps.db.getReservations.mockResolvedValue([]);
            deps.db.createReservation.mockResolvedValue({ id: 1 });

            const result = await createReservation({
                id: 1,
                name: "Jean",
                startDate: new Date("2026-05-08"),
                endDate: new Date("2026-05-10")
            }, deps);

            expect(result).toMatchObject({
                ok: true,
                reservationId: 1
            });
        });

        test("DB error while creating reservation", async () => {
            const deps = makeDeps();

            deps.db.createReservation.mockRejectedValue(new Error("DB error"));

            expect(createReservation({
                id: 1,
                name: "Jean",
                startDate: new Date("2026-05-08"),
                endDate: new Date("2026-05-10")
            }, deps)).rejects.toMatchObject({
                name: "ServiceError",
                message: "Database returned an error"
            });
        });

    });

    describe("Cancel reservation", () => {

        test("Reservation does not exist", async () => {
            const deps = makeDeps();

            deps.db.getReservationById.mockResolvedValue(null);

            expect(cancelReservation(1, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Reservation does not exist"
            });
        });

        test("Cancel reservation less than 48h before start", async () => {
            const deps = makeDeps();

            deps.db.getReservationById.mockResolvedValue({
                id: 1,
                startDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });

            expect(cancelReservation(1, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Cancellation not allowed less than 48h before start"
            });
        });

        test("Valid cancel reservation", async () => {
            const deps = makeDeps();

            deps.db.getReservationById.mockResolvedValue({
                id: 1,
                startDate: new Date(Date.now() + 72 * 60 * 60 * 1000)
            });

            deps.db.deleteReservation.mockResolvedValue(true);

            const result = await cancelReservation(1, deps);

            expect(result).toMatchObject({
                ok: true
            });
        });

        test("DB error while deleting reservation", async () => {
            const deps = makeDeps();

            deps.db.getReservationById.mockResolvedValue({
                id: 1,
                startDate: new Date(Date.now() + 72 * 60 * 60 * 1000)
            });

            deps.db.deleteReservation.mockRejectedValue(new Error("DB error"));

            expect(cancelReservation(1, deps)).rejects.toMatchObject({
                name: "ServiceError",
                message: "Database is not responding"
            });
        });

    });

    describe("Search reservation", () => {

        test("Search date undefined", async () => {
            const deps = makeDeps();

            expect(searchReservation(undefined, deps)).rejects.toMatchObject({
                name: "ValidationError",
                message: "Search date is empty"
            });
        });

        test("Search reservation returns empty list", async () => {
            const deps = makeDeps();

            deps.db.getReservations.mockResolvedValue([]);

            const result = await searchReservation(new Date("2026-05-09"), deps);

            expect(result).toEqual([]);
        });

        test("Search reservation returns active reservation", async () => {
            const deps = makeDeps();

            deps.db.getReservations.mockResolvedValue([
                { id: 1, startDate: new Date("2026-05-08"), endDate: new Date("2026-05-10") }
            ]);

            const result = await searchReservation(new Date("2026-05-09"), deps);

            expect(result.length).toBe(1);
        });

        test("DB error while searching reservation", async () => {
            const deps = makeDeps();

            deps.db.getReservations.mockRejectedValue(new Error("DB error"));

            expect(searchReservation(new Date("2026-05-09"), deps)).rejects.toMatchObject({
                name: "ServiceError",
                message: "Database is not responding"
            });
        });

    });

});