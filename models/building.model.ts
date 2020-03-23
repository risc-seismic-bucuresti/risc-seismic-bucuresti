//npm
import { Column, DataType, HasMany, Table } from "sequelize-typescript";

// models
import { EditableModel } from "./base";
import { BuildingRating } from "./building-rating.model";

@Table({
  tableName: 'buildings',
  indexes: [
    { fields: ['street_type', 'address', 'address_number'] },
    { fields: ['gps_coordinates_latitude', 'gps_coordinates_longitude'] },
  ],
})
export class Building extends EditableModel<Building> {
  @Column({ type: DataType.INTEGER, field: 'number', allowNull: false })
  public number: number;

  @Column({ type: DataType.STRING, field: 'street_type' })
  public streetType: string;

  @Column({ type: DataType.STRING, field: 'address', allowNull: false })
  public address: string;

  @Column({ type: DataType.STRING, field: 'address_number', allowNull: false })
  public addressNumber: string;

  @Column({ type: DataType.STRING, field: 'district', allowNull: false })
  public district: string;

  @Column({ type: DataType.STRING, field: 'apartment_number', allowNull: true })
  public apartmentNumber: string;

  @Column({ type: DataType.STRING, field: 'height_regime', allowNull: false })
  public heightRegime: string;

  @Column({ type: DataType.STRING, field: 'year_of_construction', allowNull: false })
  public yearOfConstruction: string;

  @Column({ type: DataType.STRING, field: 'year_of_expertise', allowNull: false })
  public yearOfExpertise: string;

  @Column({ type: DataType.STRING, field: 'surface_size' })
  public surfaceSize: string;

  @Column({ type: DataType.STRING, field: 'expert_name', allowNull: false })
  public expertName: string;

  @Column({ type: DataType.STRING, field: 'comments', allowNull: false })
  public comments: string;

  @Column({ type: DataType.FLOAT, field: 'gps_coordinates_latitude' })
  public gpsCoordinatesLatitude: number;

  @Column({ type: DataType.FLOAT, field: 'gps_coordinates_longitude' })
  public gpsCoordinatesLongitude: number;

  @HasMany(() => BuildingRating)
  public buildingRatings: BuildingRating[];
}
