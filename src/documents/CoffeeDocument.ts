import mongoose, {Document, Schema} from 'mongoose';

interface ICoffeeRequest extends Document {
    sessionId: string
    milkType: string;
    froth: boolean;
    aromaStrength: string;
    sugar: string;
    coffeeCrewPerson: string;
}

const CoffeeRequestSchema: Schema = new Schema({
    sessionId: {type: String, required: true},
    milkType: {type: String, required: true},
    froth: {type: Boolean, required: true},
    aromaStrength: {type: String, required: true},
    sugar: {type: String, required: true},
    coffeeCrewPerson: {type: String, required: true}
});

export const CoffeeRequestDocument = mongoose.model<ICoffeeRequest>('coffee_request', CoffeeRequestSchema);