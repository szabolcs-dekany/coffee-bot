import mongoose, {Document, Schema} from 'mongoose';

interface ICoffeeSession extends Document {
    sessionId: string;
    estimatedTimeOfCoffee: String;
    startDateTime: Date;
    coffeeCrewNumber: Number;
}

const CoffeeSessionSchema: Schema = new Schema({
    sessionId: {type: String, required: true},
    estimatedTimeOfCoffee: {type: String, required: true},
    startDateTime: {type: Date, required: true},
    coffeeCrewNumber: {type: Number, required: true}
});

export const CoffeeSessionDocument = mongoose.model<ICoffeeSession>('coffee_session', CoffeeSessionSchema);