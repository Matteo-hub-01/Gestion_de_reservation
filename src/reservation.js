const { ValidationError, ServiceError } = require("./errors");

async function createReservation(data, deps) {

    const { id, name, startDate, endDate } = data;

    if (!id) {
        throw new ValidationError("Id is empty");
    }

    if (!name) {
        throw new ValidationError("Name is empty");
    }

    if (!startDate) {
        throw new ValidationError("Start date is empty");
    }

    if (!endDate) {
        throw new ValidationError("End date is empty");
    }

    if (endDate <= startDate) {
        throw new ValidationError("End date must be after start date");
    }

    let reservations;

    try {
        reservations = await deps.db.getReservations();

        if (!Array.isArray(reservations)) {
            reservations = [];
        }

    } catch (err) {
        throw new ServiceError("Database is not responding", err);
    }

    for (const r of reservations) {
        const rStart = new Date(r.startDate);
        const rEnd = new Date(r.endDate);

        const overlap = startDate < rEnd && endDate > rStart;

        if (overlap) {
            throw new ValidationError("Reservation overlap");
        }
    }

    try {
        const result = await deps.db.createReservation({
            id,
            name,
            startDate,
            endDate
        });

        return {
            ok: true,
            reservationId: result.id
        };

    } catch (err) {
        throw new ServiceError("Database returned an error", err);
    }
}

async function cancelReservation(id, deps) {

    let reservation;

    try {
        reservation = await deps.db.getReservationById(id);
    } catch (err) {
        throw new ServiceError("Database is not responding", err);
    }

    if (!reservation) {
        throw new ValidationError("Reservation does not exist");
    }

    const startDate = new Date(reservation.startDate);
    const now = new Date();

    const diff = startDate - now;
    const limit = 48 * 60 * 60 * 1000;

    if (diff < limit) {
        throw new ValidationError("Cancellation not allowed less than 48h before start");
    }

    try {
        await deps.db.deleteReservation(id);

        return { ok: true };

    } catch (err) {
        throw new ServiceError("Database is not responding", err);
    }
}

async function searchReservation(date, deps) {

    if (!date) {
        throw new ValidationError("Search date is empty");
    }

    let reservations;

    try {
        reservations = await deps.db.getReservations();

        if (!Array.isArray(reservations)) {
            reservations = [];
        }

    } catch (err) {
        throw new ServiceError("Database is not responding", err);
    }

    const searchDate = new Date(date);

    return reservations.filter(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);

        return searchDate >= start && searchDate <= end;
    });
}

module.exports = {
    createReservation,
    cancelReservation,
    searchReservation
};