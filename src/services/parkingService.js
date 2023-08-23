const Boom = require('@hapi/boom');
const db = require('../../database/models/index.js');

const reserve = async (slot, startTime, endTime, date, email) => {

  if (new Date(endTime) <= new Date(startTime)) {
    throw Boom.badRequest('End time cannot be before or equal to start time.');
  }

  // Intersections:
  // 1. startTime <= startTime && (endTime <= endTime && endTime >= startTime)
  // 2. endTime >= endTime && (startTime <= endTime && startTime >= startTime)
  // 3. endTime >= endTime && (startTime >= startTime && startTime <= endTime)

  const intersectingReservations = await db.Parking.findAll({
    attributes: ['slot'],
    where: {
      date: date,
      slot: slot,
      [db.Sequelize.Op.and]: [
        {
          [db.Sequelize.Op.or]: [
            {
              startTime: {
                [db.Sequelize.Op.lt]: endTime,
                [db.Sequelize.Op.gte]: startTime
              },
              endTime: {
                [db.Sequelize.Op.gte]: endTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gt]: startTime,
                [db.Sequelize.Op.lt]: endTime
              }
            },
            {
              startTime: {
                [db.Sequelize.Op.lte]: startTime,
                [db.Sequelize.Op.lte]: endTime
              },
              endTime: {
                [db.Sequelize.Op.gte]: startTime,
                [db.Sequelize.Op.gte]: endTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gte]: endTime,
                [db.Sequelize.Op.lte]: startTime
              },
              startTime: {
                [db.Sequelize.Op.lte]: endTime,
                [db.Sequelize.Op.gte]: startTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gte]: endTime,
                [db.Sequelize.Op.lte]: startTime
              },
              startTime: {
                [db.Sequelize.Op.gte]: startTime,
                [db.Sequelize.Op.lte]: endTime
              }
            }
          ]
        }
      ]
    }
  });

  if (intersectingReservations.length > 0) {
    throw Boom.badRequest('Slot already reserved, Please choose another slot');
  }

  const newReservation = await db.Parking.create({
    slot: slot,
    date: date,
    startTime: startTime,
    endTime: endTime,
    userEmail: email,
  });

  return newReservation;
};

const getAllReservations = async () => {
  const reservations = await db.Parking.findAll();
  return reservations;
};

const getAvailableSlotsForTime = async (startTime, endTime, date) => {
  if (new Date(endTime) <= new Date(startTime)) {
    throw Boom.badRequest('End time cannot be before or equal to start time.');
  }

  const reservedSlots = await db.Parking.findAll({
    attributes: ['slot'],
    where: {
      date: date,
      [db.Sequelize.Op.and]: [
        {
          [db.Sequelize.Op.or]: [
            {
              startTime: {
                [db.Sequelize.Op.lt]: endTime,
                [db.Sequelize.Op.gte]: startTime
              },
              endTime: {
                [db.Sequelize.Op.gte]: endTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gt]: startTime,
                [db.Sequelize.Op.lt]: endTime
              }
            },
            {
              startTime: {
                [db.Sequelize.Op.lte]: startTime,
                [db.Sequelize.Op.lte]: endTime
              },
              endTime: {
                [db.Sequelize.Op.gte]: startTime,
                [db.Sequelize.Op.gte]: endTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gte]: endTime,
                [db.Sequelize.Op.lte]: startTime
              },
              startTime: {
                [db.Sequelize.Op.lte]: endTime,
                [db.Sequelize.Op.gte]: startTime
              }
            },
            {
              endTime: {
                [db.Sequelize.Op.gte]: endTime,
                [db.Sequelize.Op.lte]: startTime
              },
              startTime: {
                [db.Sequelize.Op.gte]: startTime,
                [db.Sequelize.Op.lte]: endTime
              }
            }
          ]
        }
      ]
    }
  });

  const allSlots = Array.from(Array(process.env.SLOTS).keys()).map(slot => slot + 1);
  const reservedSlotNumbers = reservedSlots.map(reservation => reservation.slot);
  const availableSlots = allSlots.filter(slot => !reservedSlotNumbers.includes(slot));

  return availableSlots;
};

const cancelReservation = async (startTime, endTime, date, slot, email) => {
  const reservation = await db.Parking.findOne({
    where: {
      slot: slot,
      date: date,
      startTime: startTime,
      endTime: endTime,
      userEmail: email
    }
  });
  
  if (!reservation) {
    throw Boom.notFound('Reservation not found');
  }

  const deletedReservation = await reservation.destroy();
  return deletedReservation; // TODO: return deleted reservation
};
  

const updateReservation = async (slot, startTime, endTime, date, email, newSlot) => {
  const reservation = await db.Parking.findOne({
    where: {
      slot: slot,
      date: date,
      startTime: startTime,
      endTime: endTime,
      userEmail: email
    }
  });

  if (!reservation) {
    throw Boom.notFound('Reservation not found');
  }

  const newReservation = await db.Parking.findOne({
    where: {
      slot: newSlot,
      date: date,
      startTime: startTime,
      endTime: endTime
    }
  });

  if (newReservation) {
    throw Boom.badRequest('Slot already reserved, Please choose another slot');
  }

  reservation.slot = newSlot;
  await reservation.save();
  return reservation; // TODO: return updated reservation
};


const getReservationsOfUser = async (email) => {
  const reservation = await db.Parking.findOne({
    where: {
      userEmail: email
    }
  });
    
  if (!reservation) {
    throw Boom.notFound('Reservation not found');
  }
    
  return reservation;
};

module.exports = {
  reserve,
  getAllReservations,
  getAvailableSlotsForTime,
  cancelReservation,
  updateReservation,
  getReservationsOfUser
};